import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const favoriteUi=read('app-favorites-ui.js');
const now=read('app-now-ui.js');
const polish=read('app-radio-console-polish.css');
const sw=read('sw.js');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}
for(const [name,src] of [['favorites UI',favoriteUi],['current UI',now]]){let ok=true,msg='';try{new vm.Script(src,{filename:name})}catch(error){ok=false;msg=error.message}check(`${name} syntax`,ok,msg)}

check('shared favorite lookup is backed by a signature-scoped Map index',favoriteUi.includes('indexMap=new Map()')&&favoriteUi.includes('function favoriteIndex(')&&favoriteUi.includes('indexSignature!==signature')&&favoriteUi.includes('indexMap.set(String(id),row)'));
check('shared favoriteFor uses indexed lookup rather than scanning the collection per card',favoriteUi.includes('favoriteIndex(userId).get(String(id))')&&!favoriteUi.includes("function favoriteFor(id,userId=currentUser()){if(id===null||id===undefined||id===''||!userId)return null;return(R.favorites||[]).find"));
check('favorite index is invalidated on account transitions',favoriteUi.includes("R.events?.on?.('auth:changed',()=>{indexUser=null;indexSignature=null;indexMap=new Map();schedule()})"));
check('current screen exposes an independent accessible favorites scope',now.includes('data-now-favorites')&&now.includes('aria-label="Kişisel öneri filtresi"')&&now.includes('aria-pressed="${favoriteOnly?\'true\':\'false\'}"'));
check('current favorites scope remains independent of band mode filtering',now.includes('function baseCandidates(m=mode())')&&now.includes('function buildViewState(m=mode())')&&now.includes('view.rows=favoriteOnly?base.filter(e=>view.favoriteStates.get(e)===true):base'));
check('current favorite matching accepts backend canonical MW favorite intelligence',now.includes('e._radioConsole&&intelligenceFor(e,view)?.favorite?.active'));
check('current favorite matching uses shared indexed guide favorites for ordinary candidates',now.includes('R.favoriteVisibilityUI?.favoriteFor?.(id,R.me.id)'));
check('current favorites scope shows a live count and honest empty state',now.includes('function favoriteCount(m=mode()){return buildViewState(m).favoriteCount}')&&now.includes('favorites.toLocaleString')&&now.includes('Şu anki öneri listesinde favori yayın adayın yok.'));
check('current render builds one reusable view snapshot instead of rebuilding candidates and favorite counts',now.includes('view=buildViewState(m),full=view.rows')&&now.includes('favorites=view.favoriteCount')&&!now.includes('full=candidates(m)')&&!now.includes('favorites=favoriteCount(m)'));
check('current render passes the same snapshot to hero, candidate cards and reasons',now.includes('featured(lead,view)')&&now.includes('others.map(e=>candidateCard(e,view))')&&now.includes('why(lead,view)'));
check('current render reuses snapshot MW presence instead of rescanning radio-console rows',now.includes('!view.mwCount&&!mwLoadRequested')&&!now.includes('!mwCandidates().length&&!mwLoadRequested'));
check('MW intelligence and guide matching expose per-view memoized helpers',now.includes('function intelligenceFor(e,view=null)')&&now.includes('view?.intelligence?.has(e)')&&now.includes('function guideMatchFor(e,view=null)')&&now.includes('view?.guideMatches?.has(e)'));
check('favorite changes rerender current recommendations and account changes reset the scope',now.includes("R.events?.on?.('favorites:changed',()=>scheduleRender(0,{resetLimit:true}))")&&now.includes("R.events?.on?.('auth:changed',()=>{favoriteOnly=false"));
check('current render event reports favorite scope state',now.includes('favoriteOnly,favoriteCount:favorites'));
check('current favorites scope has active, focus and mobile styles',polish.includes('.radio-personal-scopes button.active')&&polish.includes('.radio-personal-scopes button:focus-visible')&&polish.includes('@media(max-width:480px){.radio-console-screen{gap:11px}.radio-personal-scopes'));
check('service worker carries current favorites scope release marker',sw.includes("CURRENT_FAVORITES_SCOPE='20260916-10'"));
check('service worker carries current render snapshot release marker',sw.includes("NOW_RENDER_SNAPSHOT='20260916-17'"));

class ElementStub{}
const listeners=new Map();
const favoriteR={
  me:{id:'u1'},
  favorites:[{user_id:'u1',guide_entry_id:'g1',id:'f1'},{user_id:'u1',guide_entry_id:'g2',id:'f2'}],
  userServices:{favoriteCollectionSignature(userId){return favoriteR.favorites.filter(x=>x.user_id===userId).map(x=>String(x.guide_entry_id)).sort().join('|')}},
  events:{on(name,fn){listeners.set(name,fn)}},
  features:{register(){}}
};
const favoriteDocument={querySelector(){return null},querySelectorAll(){return[]},addEventListener(){}};
const favoriteSandbox={window:{R:favoriteR},R:favoriteR,document:favoriteDocument,Element:ElementStub,globalThis:null,Map,Set,Array,Object,String,Number,Math,Date,Error,console,queueMicrotask:fn=>fn(),requestAnimationFrame:fn=>fn()};
favoriteSandbox.globalThis=favoriteSandbox;
vm.createContext(favoriteSandbox);
vm.runInContext(favoriteUi,favoriteSandbox,{filename:'app-favorites-ui.js'});
const firstIndex=favoriteR.favoriteVisibilityUI.favoriteIndex('u1');
check('runtime favorite index resolves owned favorites in O(1)-style map lookup',firstIndex instanceof Map&&firstIndex.size===2&&favoriteR.favoriteVisibilityUI.favoriteFor('g2','u1')?.id==='f2');
favoriteR.favorites=[...favoriteR.favorites,{user_id:'u1',guide_entry_id:'g3',id:'f3'}];
const secondIndex=favoriteR.favoriteVisibilityUI.favoriteIndex('u1');
check('runtime favorite index rebuilds only when the collection signature changes',secondIndex!==firstIndex&&secondIndex.size===3&&favoriteR.favoriteVisibilityUI.favoriteFor('g3','u1')?.id==='f3');

const rootNode={innerHTML:''},tabNode={appendChild(){}},appNode={insertBefore(){},firstChild:null};
const nowRows=[
  {_radioConsole:true,schedule_id:'m1',frequency:600,score:60,station:'MW Favorite',reception_class:'Bölgesel'},
  {_radioConsole:true,schedule_id:'m2',frequency:700,score:65,station:'MW Canonical Favorite',reception_class:'Gece DX'}
];
const legacy={id:'g3',mode:'SW',frequency:9500,station:'SW Other'};
let rowsCalls=0;
const intelligenceCalls=new Map(),guideCalls=new Map();
const bump=(map,key)=>map.set(key,(map.get(key)||0)+1);
const nowR={
  me:{id:'u1'},favorites:[{user_id:'u1',guide_entry_id:'g1'}],guideEntries:[{id:'g1'}],
  uiState:{nowMode:'ALL'},nowMode:'ALL',
  radioConsole:{
    rows(){rowsCalls+=1;return nowRows},
    guideMatch(row){bump(guideCalls,row.schedule_id);return{id:row.schedule_id==='m1'?'g1':'g2'}},
    intelligence(row){bump(intelligenceCalls,row.schedule_id);return{favorite:{active:row.schedule_id==='m2',bonus:row.schedule_id==='m2'?4:0},propagation:{period:'night'},target:{},personal:{},activity:{}}},
    classKey:value=>value==='Gece DX'?'dx':'regional',guideMeta:()=>({time:'20:00–22:00'}),reasons:()=>[],bandScale:()=>({pct:50,ticks:[531,603,720,873,1188,1350,1602]})
  },
  favoriteVisibilityUI:{favoriteFor:id=>id==='g1'?{guide_entry_id:'g1'}:null},
  radioNowCandidates:m=>m==='ALL'||m==='SW'?[legacy]:[],
  currentPrograms:{receiverCompatible:()=>true},
  guideService:{currentWindowText:()=> '20:00–21:00'},
  events:{on(){},emit(){}},features:{register(){}},router:{current:()=> 'home',register(){}},
  esc:v=>String(v??'')
};
const nowDocument={
  hidden:false,
  querySelector(selector){if(selector==='#tab-now')return tabNode;if(selector==='#v38Now')return rootNode;if(selector==='#appView')return appNode;return null},
  createElement(){return{className:'',id:'',appendChild(){}}},
  addEventListener(){}
};
const nowSandbox={window:{R:nowR},R:nowR,document:nowDocument,Element:ElementStub,globalThis:null,Intl,Map,Set,Array,Object,String,Number,Math,Date,Error,console,setTimeout(){return 1},clearTimeout(){},requestAnimationFrame:fn=>fn()};
nowSandbox.globalThis=nowSandbox;
vm.createContext(nowSandbox);
vm.runInContext(now,nowSandbox,{filename:'app-now-ui.js'});
check('runtime current favorite matcher combines guide favorites with backend MW favorite intelligence',nowR.nowUI.favoriteCandidate(nowRows[0])===true&&nowR.nowUI.favoriteCandidate(nowRows[1])===true&&nowR.nowUI.favoriteCandidate(legacy)===false);
check('runtime current favorite count spans independent MW favorite sources',nowR.nowUI.favoriteCount('ALL')===2);
nowR.nowUI.favoriteOnly=true;
const filtered=nowR.nowUI.candidates('ALL');
check('runtime current favorites scope removes nonfavorite candidates without changing band selection',filtered.length===2&&filtered.every(x=>x._radioConsole===true)&&nowR.uiState.nowMode==='ALL');

nowR.nowUI.favoriteOnly=false;rowsCalls=0;intelligenceCalls.clear();guideCalls.clear();
const view=nowR.nowUI.buildViewState('ALL');
check('runtime current view snapshot scans MW source rows once',rowsCalls===1,`rows=${rowsCalls}`);
check('runtime current view snapshot derives favorite count and filtered rows together',view.base.length===3&&view.rows.length===3&&view.favoriteCount===2&&view.mwCount===2);
check('runtime current view snapshot resolves MW intelligence once per candidate',intelligenceCalls.get('m1')===1&&intelligenceCalls.get('m2')===1,JSON.stringify([...intelligenceCalls]));
nowR.nowUI.mwReasonChips(nowRows[0],view);nowR.nowUI.whyParts(nowRows[0],view);nowR.nowUI.intelligenceFor(nowRows[0],view);
check('runtime hero/reason intelligence reuse does not reparse the same MW row',intelligenceCalls.get('m1')===1,`m1=${intelligenceCalls.get('m1')}`);
nowR.nowUI.guideMatchFor(nowRows[0],view);nowR.nowUI.guideMatchFor(nowRows[0],view);
nowR.nowUI.guideMatchFor(nowRows[1],view);nowR.nowUI.guideMatchFor(nowRows[1],view);
check('runtime guide matching is memoized within the same current view',guideCalls.get('m1')===1&&guideCalls.get('m2')===1,JSON.stringify([...guideCalls]));

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} current-favorites-scope checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
