import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const service=read('app-radio-console-service.js');
const sw=read('sw.js');
const checks=[];
const check=(name,ok,detail='')=>{checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1};

let syntax=true,syntaxDetail='';
try{new vm.Script(service,{filename:'app-radio-console-service.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('radio console service syntax',syntax,syntaxDetail);
check('service indexes cached MW rows by schedule id',service.includes('rowByScheduleId=new Map()')&&service.includes('function indexRows(')&&service.includes('rowByScheduleId.get(key)'));
check('service indexes eligible MW guide entries by id frequency and normalized station',service.includes('guideById=new Map()')&&service.includes('guideByFrequencyFirst=new Map()')&&service.includes('guideByFrequencyName=new Map()')&&service.includes('function normalizedStation('));
check('guide matching preserves direct id then frequency-name then frequency fallback priority',service.indexOf('guideById.get(')<service.indexOf('guideByFrequencyName.get(')&&service.indexOf('guideByFrequencyName.get(')<service.indexOf('guideByFrequencyFirst.get('));
check('guide index is lazily rebuilt and explicitly invalidated by guide/store data events',service.includes('function ensureGuideIndex(){if(guideIndexDirty)rebuildGuideIndex()}')&&service.includes("R.events?.on?.('guide:data-ready',invalidateGuideIndex)")&&service.includes("R.events?.on?.('data:loaded',invalidateGuideIndex)")&&service.includes("R.events?.on?.('store:updated',invalidateGuideIndex)"));
check('service worker carries MW guide-match index signature',sw.includes("MW_GUIDE_MATCH_INDEX='20260916-11'"));

const handlers=new Map();
const on=(name,fn)=>{const list=handlers.get(name)||[];list.push(fn);handlers.set(name,list)};
const emit=(name,payload)=>{for(const fn of handlers.get(name)||[])fn(payload)};
let compatibilityChecks=0,rpcCalls=0;
const guideEntries=[
  {id:'direct',entry_type:'station_target',mode:'MW',frequency:999,station:'Doğrudan Eşleşme'},
  {id:'first-600',entry_type:'station_target',mode:'MW',frequency:600,station:'Başka İstasyon'},
  {id:'named-600',entry_type:'station_target',mode:'MW',frequency:600,station:'Test Radio'},
  {id:'blocked-600',entry_type:'station_target',mode:'MW',frequency:600,station:'Test Radio',blocked:true},
  {id:'sw-600',entry_type:'station_target',mode:'SW',frequency:600,station:'Test Radio'}
];
const R={
  me:{id:'u1'},
  guideEntries,
  norm:value=>String(value??'').toLocaleLowerCase('tr-TR').trim(),
  guideService:{receiverCompatible(entry){compatibilityChecks++;return entry?.blocked!==true}},
  router:{current:()=> 'home'},
  S:{async rpc(){rpcCalls++;return{data:[
    {schedule_id:'dup',frequency:600,station:'İlk Satır',score:70},
    {schedule_id:'dup',frequency:600,station:'İkinci Satır',score:60},
    {schedule_id:'unique',frequency:700,station:'Tek Satır',score:65}
  ],error:null}}},
  events:{on,emit},features:{register(){}},reportError(){},
};
const assets=[];
const document={querySelector(){return null},createElement(tag){return{tagName:String(tag).toUpperCase(),dataset:{}}},head:{appendChild(node){assets.push(node)}}};
const sandbox={window:{R},R,document,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console,setTimeout,clearTimeout};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(service,sandbox,{filename:'app-radio-console-service.js'});

const direct=R.radioConsole.guideMatch({schedule_id:'direct',frequency:600,canonical_name:'Test Radio'});
check('runtime direct guide id wins even when row frequency differs',direct?.id==='direct');
const firstBuildChecks=compatibilityChecks;
const named=R.radioConsole.guideMatch({schedule_id:'missing',frequency:600,canonical_name:'TEST RADIO'});
const fallback=R.radioConsole.guideMatch({schedule_id:'missing-2',frequency:600,canonical_name:'Bilinmeyen'});
check('runtime normalized station match wins inside same frequency',named?.id==='named-600');
check('runtime frequency fallback preserves first eligible guide entry',fallback?.id==='first-600');
check('runtime repeated guide matches reuse built index without rescanning compatibility',compatibilityChecks===firstBuildChecks);

emit('guide:data-ready',{});
R.radioConsole.guideMatch({schedule_id:'missing-3',frequency:600,canonical_name:'Test Radio'});
check('runtime guide-data invalidation causes one lazy rebuild on next match',compatibilityChecks>firstBuildChecks);
const afterGuideRebuild=compatibilityChecks;
R.radioConsole.guideMatch({schedule_id:'missing-4',frequency:600,canonical_name:'Başka İstasyon'});
check('runtime rebuilt guide index is reused again',compatibilityChecks===afterGuideRebuild);

await R.radioConsole.loadMw({force:true});
check('runtime MW RPC loads once',rpcCalls===1);
check('runtime schedule index preserves first row for duplicate schedule id',R.radioConsole.get('dup')?.station==='İlk Satır');
check('runtime schedule index resolves unique row and missing row safely',R.radioConsole.get('unique')?.station==='Tek Satır'&&R.radioConsole.get('missing')===null);
R.radioConsole.clear();
check('runtime clearing console clears schedule index too',R.radioConsole.get('dup')===null);

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} MW guide-match index checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
