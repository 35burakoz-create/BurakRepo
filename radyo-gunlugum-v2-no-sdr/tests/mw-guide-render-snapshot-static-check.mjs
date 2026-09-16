import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const guide=read('app-mw-guide-ui.js');
const sw=read('sw.js');
const checks=[];
const check=(name,ok,detail='')=>{checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1};

let syntax=true,syntaxDetail='';
try{new vm.Script(guide,{filename:'app-mw-guide-ui.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('MW guide syntax',syntax,syntaxDetail);
check('MW guide builds one reusable base and view snapshot',guide.includes('function buildBaseState()')&&guide.includes('function buildViewState(baseState=buildBaseState())'));
check('render reuses one view snapshot for toolbar filtering and cards',guide.includes('const view=buildViewState(),filteredRows=view.rows;ensureToolbar(view)')&&guide.includes('shown.map(row=>card(row,view))'));
check('toolbar consumes precomputed counts instead of recomputing filters',guide.includes('const counts=view.counts,favorites=view.favoriteCounts.all')&&!guide.includes('const counts=filterCounts(),favorites=favoriteCount()'));
check('favorite quick scopes consume one precomputed favorite count map',guide.includes('const count=view.favoriteCounts[value]||0'));
check('cards reuse memoized intelligence and favorite state',guide.includes('const intel=intelligenceFor(row,view)')&&guide.includes('view?.favoriteStates?.get(row)||favoriteState(row)'));
check('filter clicks render directly instead of rebuilding toolbar twice',!guide.includes('visibleLimit=PAGE_SIZE;ensureToolbar();render()'));
check('non-MW guide paths hide toolbar without building MW snapshots',guide.includes("if(!active()){hideToolbar();header(false);return false}"));
check('service worker carries MW guide render-snapshot signature',sw.includes("MW_GUIDE_RENDER_SNAPSHOT='20260916-12'"));

const rows=[
  {schedule_id:'a',frequency:600,reception_class:'Yerel',active_now:true,station:'A'},
  {schedule_id:'b',frequency:700,reception_class:'Gece DX',active_now:false,station:'B'},
  {schedule_id:'c',frequency:800,reception_class:'Bölgesel',active_now:true,station:'C'},
  {schedule_id:'d',frequency:900,reception_class:'Çok uzak',active_now:false,station:'D'}
];
let rowsCalls=0,classKeyCalls=0,guideMatchCalls=0,intelligenceCalls=0;
const favoriteIds=new Set(['ga','gb']);
const idMap=new Map([['a','ga'],['b','gb'],['c','gc'],['d','gd']]);
const handlers=new Map();
const R={
  me:{id:'u1'},favorites:[],
  router:{current:()=> 'home'},
  radioConsole:{
    rows(){rowsCalls++;return rows},
    classKey(value){classKeyCalls++;return value==='Yerel'?'local':value==='Gece DX'?'dx':value==='Bölgesel'?'regional':'far'},
    guideMatch(row){guideMatchCalls++;return{id:idMap.get(row.schedule_id)}},
    intelligence(row){intelligenceCalls++;return{geometry:{label:`geo-${row.schedule_id}`},propagation:{period:'day'},target:{text:'',bonus:0},personal:{adjustment:0},favorite:{active:false,bonus:0}}}
  },
  favoriteVisibilityUI:{favoriteFor(id){return favoriteIds.has(String(id))?{guide_entry_id:id,user_id:'u1'}:null}},
  events:{on(name,fn){const list=handlers.get(name)||[];list.push(fn);handlers.set(name,list)}},features:{register(){}},
  esc:value=>String(value??''),
};
const document={
  querySelector(selector){if(selector==='#guideSearch')return{value:''};if(selector==='#guideFreq')return{value:''};if(selector==='#guideBand')return{value:'MW'};return null},
  querySelectorAll(){return[]},
  createElement(tag){return{tagName:String(tag).toUpperCase(),dataset:{},setAttribute(){},appendChild(){},insertAdjacentElement(){}}},
  addEventListener(){},
  head:{appendChild(){}},
};
const sandbox={window:{R},R,document,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),Element:class{}};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(guide,sandbox,{filename:'app-mw-guide-ui.js'});

rowsCalls=classKeyCalls=guideMatchCalls=intelligenceCalls=0;
const view=R.mwGuideUI.buildViewState();
check('runtime snapshot reads MW source rows once',rowsCalls===1,`rows=${rowsCalls}`);
check('runtime snapshot classifies each matching row once',classKeyCalls===rows.length,`class=${classKeyCalls}`);
check('runtime snapshot resolves favorite state once per class-filtered row',guideMatchCalls===rows.length,`guide=${guideMatchCalls}`);
check('runtime snapshot derives all favorite scope counts together',view.favoriteCounts.all===2&&view.favoriteCounts.active===1&&view.favoriteCounts.night===1,JSON.stringify(view.favoriteCounts));
check('runtime snapshot keeps unfiltered rows when favorite scope is off',view.rows.length===4);

const firstIntel=R.mwGuideUI.intelligenceFor(rows[0],view);
const secondIntel=R.mwGuideUI.intelligenceFor(rows[0],view);
check('runtime card intelligence is memoized inside one render snapshot',firstIntel===secondIntel&&intelligenceCalls===1,`intel=${intelligenceCalls}`);

R.mwGuideUI.favoriteOnly=true;
rowsCalls=classKeyCalls=guideMatchCalls=0;
const favoritesView=R.mwGuideUI.buildViewState();
check('runtime favorite-only snapshot keeps both owned favorites',favoritesView.rows.map(x=>x.schedule_id).join(',')==='a,b');
check('runtime favorite-only snapshot still performs one source scan',rowsCalls===1&&classKeyCalls===rows.length&&guideMatchCalls===rows.length,`rows=${rowsCalls}, class=${classKeyCalls}, guide=${guideMatchCalls}`);

R.mwGuideUI.favoriteScope='active';
const activeView=R.mwGuideUI.buildViewState();
check('runtime active favorite scope uses precomputed favorite state',activeView.rows.length===1&&activeView.rows[0].schedule_id==='a');
R.mwGuideUI.favoriteScope='night';
const nightView=R.mwGuideUI.buildViewState();
check('runtime night favorite scope uses precomputed class identity',nightView.rows.length===1&&nightView.rows[0].schedule_id==='b');

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} MW guide render-snapshot checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
