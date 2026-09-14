import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

const search=read('v44-search-rebuild.js');
const memory=read('app-memory.js');
const atlas=read('app-atlas-service.js');
const audio=read('app-audio-ui.js');
const backup=read('app-backup.js');
const runtime=read('app-runtime-core.js');
for(const [file,src] of [['v44-search-rebuild.js',search],['app-memory.js',memory],['app-atlas-service.js',atlas],['app-audio-ui.js',audio],['app-backup.js',backup],['app-runtime-core.js',runtime]]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

check('search closes stale results on account change',search.includes("R.events?.on?.('auth:changed',()=>{actionGeneration++;if(root)close({restoreFocus:false})})"));
check('delayed guide search is pinned to account and route',search.includes("R.me?.id!==userId||R.router?.current?.()!=='guide'"));
check('search rejects zero and negative numeric frequencies',search.includes('f<=0||n<=0')&&search.includes('return n>0?n:NaN'));
check('search dedupe has fallback identities for rows without ids',search.includes('function logKey(x)')&&search.includes('function guideKey(x)')&&search.includes('row:${x?.date'));

check('Radio Memory accepts only personal 1-5 signal values',memory.includes('function validSignal(v)')&&memory.includes('n>=1&&n<=5'));
check('Radio Memory validates real Gregorian dates',memory.includes('function strictDate(value)')&&memory.includes('x.getUTCFullYear()===y'));
check('Radio Memory validates minutes as well as hours',memory.includes('function clockHour(value)')&&memory.includes('([0-5]\\d)'));
check('Radio Memory country subset dedupe is Set based',memory.includes('_ids:new Set()')&&memory.includes('g._ids.has(id)'));
check('Radio Memory rejects invalid frequency groups',memory.includes("Number.isFinite(n)&&n>0?`${x.band}|${n.toFixed(3)}`:''"));
check('Radio Memory attempt history uses a 50k explicit ceiling',memory.includes('MAX_ATTEMPTS=50000')&&memory.includes('MAX_ATTEMPTS,MAX_ATTEMPTS'));
check('Radio Memory does not silently return an over-limit partial history',memory.includes('veri sessizce kesilmedi')&&memory.includes("return[]"));
check('Radio Memory attempt statistics ignore unknown result values',memory.includes("['heard','weak','none'].includes(x.result)"));

check('Atlas uses bounded signal values',atlas.includes('function validSignal(v)')&&atlas.includes('n>=1&&n<=5'));
check('Atlas validates full clock values',atlas.includes('function clockHour(value)')&&atlas.includes('([0-5]\\d)'));
check('Atlas ignores non-positive frequencies',atlas.includes('function validFrequency(v)')&&atlas.includes('n>0'));
check('Atlas explicitly excludes foreign-account rows',atlas.includes('x?.user_id==null||x.user_id===userId'));
check('Atlas attempt rate ignores unknown result values',atlas.includes(".filter(x=>['heard','weak','none'].includes(x?.result))"));

check('audio validation rejects zero byte files',audio.includes("Number(blob.size)<=0")&&audio.includes('Ses dosyası boş veya okunamıyor.'));
check('audio validation checks extension when MIME is absent',audio.includes('AUDIO_EXT_RE')&&audio.includes("!type&&name&&!AUDIO_EXT_RE.test(name)"));
check('invalid file choice clears the previously staged audio',audio.includes("if(!q.ok){clearStagedAudio();event.target.value=''"));
check('recording stop validates the produced blob',audio.includes('check=validateBlob(blob)')&&audio.includes('clearStagedAudio();msg(check.message)'));
check('speech restart strips old interim text',audio.includes('function speechSeed(value)')&&audio.includes("finalText=speechSeed($('#speechText')?.value)"));
check('transcript copy reuses the same interim sanitizer',audio.includes('const text=speechSeed(source.value)'));

check('runtime exact safety boundary uses a one-row overflow probe',runtime.includes('range(MAX_ROWS,MAX_ROWS)')&&runtime.includes("if((probe.data||[]).length)throw new Error"));
check('backup row pagination probes beyond the exact limit',backup.includes('range(MAX_ROWS,MAX_ROWS)')&&backup.includes('userRowsQuery(table,order,userId)'));
check('backup audio pagination probes item 10001',backup.includes("audioListOptions(1,MAX_AUDIO)")&&backup.includes("Ses dosyası listesi yedekleme güvenlik sınırını aştı."));

// Functional global-search no-id dedupe.
{
  const makeNode=()=>({dataset:{},classList:{add(){},remove(){}},appendChild(){},append(){},addEventListener(){},setAttribute(){},remove(){}});
  const document={querySelector(){return null},createElement:makeNode,head:{appendChild(){}},documentElement:{classList:{add(){},remove(){}}},addEventListener(){},activeElement:null};
  const R={me:{id:'u1'},logs:[
    {date:'2026-09-10',time:'10:00',band:'SW9',frequency:17650,station:'Test Station'},
    {date:'2026-09-11',time:'11:00',band:'SW9',frequency:17650,station:'Test Station'}
  ],guideEntries:[],events:{on(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR')};
  const sandbox={window:{R,addEventListener(){}},document,globalThis:null,HTMLElement:class{},Element:class{},Event:class{},Map,Set,Array,Object,String,Number,Math,Date,Intl,console,setTimeout(){return 0},clearTimeout(){}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(search,sandbox,{filename:'v44-search-rebuild.js'});
  const data=R.v44SearchEngine('test station'),records=data.groups.find(x=>x.title==='Kayıtlar');
  check('search keeps distinct no-id legacy rows',records?.items?.length===2);
  check('search numeric zero is not treated as a frequency query',!data.query.includes('\0')&&R.v44SearchEngine('0').groups.every(g=>g.title!=='Frekanslar'));
}

// Functional Radio Memory validation helpers.
{
  const node=()=>({dataset:{},className:'',appendChild(){},insertBefore(){},replaceChildren(){},querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},prepend(){},innerHTML:''});
  const tab=node(),rootNode=node();
  const document={querySelector:s=>s==='#tab-memory'?tab:s==='#appMemory'?rootNode:null,querySelectorAll(){return[]},createElement:node,head:{appendChild(){}},addEventListener(){}};
  const storage=new Map();
  const R={me:{id:'u1'},logs:[],store:{state:{logs:[]}},router:{register(){},current(){return'home'}},events:{on(){}},features:{register(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR')};
  const sandbox={window:{R},document,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0},clearTimeout(){}};
  vm.createContext(sandbox);vm.runInContext(memory,sandbox,{filename:'app-memory.js'});
  check('Radio Memory signal helper ignores corrupt 99/5',JSON.stringify(R.memory.signals([{signal_strength:4},{signal_strength:99},{signal_strength:0}]))==='[4]');
  check('Radio Memory hour helper accepts 03:59',R.memory.clockHour('03:59')===3);
  check('Radio Memory hour helper rejects 03:99 and 24:00',R.memory.clockHour('03:99')===null&&R.memory.clockHour('24:00')===null);
  check('Radio Memory date helper accepts leap day',R.memory.strictDate('2024-02-29')===true);
  check('Radio Memory date helper rejects impossible day',R.memory.strictDate('2026-02-29')===false);
  check('Radio Memory invalid frequency has no group key',R.memory.freqKey({band:'SW9',frequency:'bad'})==='');
  check('Radio Memory best hour ignores malformed clock rows',R.memory.bestHour([{time:'03:99'},{time:'04:10'},{time:'04:20'}])==='04:00–05:00');
}

// Functional Atlas malformed-data and account isolation.
{
  const R={
    me:{id:'u1'},norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),events:{on(){},emit(){}},features:{register(){}},
    listeningOrigin:()=>({name:'Bozköy',lat:38.151,lon:27.36}),
    logs:[
      {user_id:'u1',country:'Romanya',band:'SW9',frequency:17650,time:'10:15',signal_strength:4,status:'confirmed'},
      {user_id:'u1',country:'Romanya',band:'SW9',frequency:17700,time:'10:99',signal_strength:99},
      {user_id:'u1',country:'Romanya',band:'SW9',frequency:-1,time:'11:15',signal_strength:2},
      {user_id:'u2',country:'Çin',band:'SW5',frequency:9500,time:'12:00',signal_strength:5}
    ],
    listening:{state:{userId:'u1',attempts:[{result:'heard'},{result:'unknown'},{result:'none'}]}}
  };
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{origin:{name:'Bozköy',lat:38.151,lon:27.36}},Date,Math,Number,String,Array,Object,Map,Set,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(atlas,sandbox,{filename:'app-atlas-service.js'});
  const s=R.atlas.summary('ALL');
  check('Atlas foreign account row is excluded from summary',s.logs===3&&s.countries===1);
  check('Atlas average ignores corrupt 99/5 value',Math.abs(s.avgSignal-3)<1e-9);
  check('Atlas malformed minute does not enter hourly histogram',s.hourRows[10].count===1&&s.hourRows[11].count===1);
  check('Atlas non-positive frequency is excluded from frequency table',s.frequencyRows.every(x=>x.frequency>0));
  check('Atlas attempt denominator ignores unknown results',s.attempts.total===2&&s.attempts.rate===50);
}

// Functional audio validation helpers.
{
  const document={querySelector(){return null}};
  const R={me:{id:'u1'},router:{register(){},current(){return'audio'}},events:{on(){},emit(){}},features:{register(){}}};
  const sandbox={window:{R,addEventListener(){}},document,navigator:{},URL:{revokeObjectURL(){},createObjectURL(){return'blob:test'}},Blob,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0},setInterval(){return 0},clearInterval(){}};
  vm.createContext(sandbox);vm.runInContext(audio,sandbox,{filename:'app-audio-ui.js'});
  check('audio rejects empty blob',R.audioUI.validateBlob({size:0,type:'audio/wav'}).ok===false);
  check('audio rejects extensionless non-audio file with blank MIME',R.audioUI.validateBlob({size:10,type:'',name:'notes.txt'}).ok===false);
  check('audio accepts recognized audio extension with blank MIME',R.audioUI.validateBlob({size:10,type:'',name:'sample.wav'}).ok===true);
  check('speech seed removes trailing interim transcript',R.audioUI.speechSeed('Merhaba\n[geçici metin]')==='Merhaba');
}

// Functional runtime exact-limit and overflow checks.
{
  const R={events:{emit(){}},features:{register(){}}};
  const sandbox={window:{R},Map,Array,Object,String,Number,Math,Date,Promise,Error,Intl,console};vm.createContext(sandbox);vm.runInContext(runtime,sandbox,{filename:'app-runtime-core.js'});
  const page=Array.from({length:1000},(_,i)=>i);
  const exact=await R.runtime.fetchPaged(()=>({async range(from){return{data:from===50000?[]:page,error:null}}}),'Test rows');
  check('runtime accepts exactly 50,000 rows',exact.length===50000);
  let overflow=false;try{await R.runtime.fetchPaged(()=>({async range(from){return{data:from===50000?[1]:page,error:null}}}),'Test rows')}catch{overflow=true}
  check('runtime rejects row 50,001',overflow);
}

// Functional backup exact row and audio boundaries.
{
  const page1000=Array.from({length:1000},(_,i)=>({id:i})),page100=Array.from({length:100},(_,i)=>({name:`f${i}.webm`,metadata:{size:1,mimetype:'audio/webm'}}));
  const R={
    me:{id:'u1'},events:{on(){}},features:{register(){}},clock:{today:()=> '2026-09-14'},
    S:{
      from(){return{select(){return this},eq(){return this},order(){return this},async range(from){return{data:from===50000?[]:page1000,error:null}}}},
      storage:{from(){return{async list(_uid,opt){return{data:opt.offset===10000?[]:page100,error:null}}}}}
    }
  };
  const document={querySelector(){return null}};
  const sandbox={window:{R},document,globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',version:'3.8.5'},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,alert(){},setTimeout(){return 0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(backup,sandbox,{filename:'app-backup.js'});
  const rows=await R.backup.fetchUserRows('x','created_at','u1');
  check('backup accepts exactly 50,000 table rows',rows.length===50000);
  const files=await R.backup.fetchAudioManifest('u1');
  check('backup accepts exactly 10,000 audio manifest rows',files.length===10000);
  R.S.from=()=>({select(){return this},eq(){return this},order(){return this},async range(from){return{data:from===50000?[{id:'overflow'}]:page1000,error:null}}});
  let rowOverflow=false;try{await R.backup.fetchUserRows('x','created_at','u1')}catch{rowOverflow=true}
  check('backup rejects table row 50,001',rowOverflow);
  R.S.storage.from=()=>({async list(_uid,opt){return{data:opt.offset===10000?[{name:'overflow.webm'}]:page100,error:null}}});
  let audioOverflow=false;try{await R.backup.fetchAudioManifest('u1')}catch{audioOverflow=true}
  check('backup rejects audio manifest row 10,001',audioOverflow);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} quaternary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
