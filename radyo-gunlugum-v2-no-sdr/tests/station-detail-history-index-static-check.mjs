import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const source=fs.readFileSync(path.join(root,'app-station-detail-ui.js'),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

let syntax=true,syntaxDetail='';
try{new vm.Script(source,{filename:'app-station-detail-ui.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('station detail module syntax',syntax,syntaxDetail);
check('personal history uses lazy indexed state',source.includes('personalIndexLogs')&&source.includes('personalIndexUser')&&source.includes('personalIndexDirty')&&source.includes('personalByStation=new Map()'));
check('personal index is account-aware and excludes explicit foreign rows',source.includes('function ownedPersonalLog')&&source.includes('!!userId&&owner===userId'));
check('personal average accepts only the 1–5 signal scale',source.includes('signal>=1&&signal<=5'));
check('personal index invalidates on record and loaded-store changes',source.includes("['record:saved','record:deleted']")&&source.includes("['data:loaded','store:updated']")&&source.includes('invalidatePersonalHistory();refreshOpen()'));
check('station detail reuses shared favorite lookup when available',source.includes('R.favoriteVisibilityUI?.favoriteFor?.(guideId,uid)')&&source.includes('R.favoriteVisibilityUI?.favoriteFor?!!shared'));

const handlers=new Map();
let sharedFavoriteCalls=0;
const row={schedule_id:'mw1',frequency:600,station:'Test MW',canonical_name:'Test MW',reception_class:'Gece DX',score:70,distance_km:null,bearing_deg:null,power_kw:null};
const R={
  me:{id:'u1'},
  logs:[
    {user_id:'u1',band:'MW',frequency:600,station:'Test MW',signal_strength:4,time:'01:10'},
    {user_id:'u1',band:'MW',frequency:600,station:'Test MW',signal_strength:2,time:'01:50'},
    {band:'MW',frequency:600,station:'Test MW',signal_strength:5,time:'09:00'},
    {user_id:'u2',band:'MW',frequency:600,station:'Test MW',signal_strength:1,time:'13:00'},
    {user_id:'u1',band:'MW',frequency:600,station:'Test MW',signal_strength:99,time:'01:20'},
    {user_id:'u1',band:'MW',frequency:600,station:'Test MW',signal_strength:3,time:'99:99'}
  ],
  favorites:[],
  norm(value=''){return String(value).toLocaleLowerCase('tr-TR')},
  radioConsole:{
    guideMatch(){return{id:'g1'}},
    originName(){return'Bozköy'},
    guideMeta(){return{}},
    reasons(){return[]},
    intelligence(){return{}},
    classKey(){return'dx'},
    bandScale(){return{pct:50,ticks:[600]}},
    get(){return row}
  },
  favoriteVisibilityUI:{favoriteFor(id,userId){sharedFavoriteCalls+=1;return id==='g1'&&userId==='u1'?{guide_entry_id:'g1'}:null}},
  events:{on(name,fn){handlers.set(name,fn)}},
  features:{register(){}}
};
const document={
  querySelector(){return null},
  addEventListener(){},
  documentElement:{classList:{remove(){},add(){}}},
  activeElement:null,
  body:{appendChild(){}},
  createElement(){return{dataset:{},classList:{},querySelector(){return null}}}
};
const sandbox={window:{R},R,document,Element:class{},HTMLElement:class{},globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Intl,Error,console,setTimeout(){return 1},requestAnimationFrame(fn){fn?.()}};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'app-station-detail-ui.js'});

const first=R.stationDetailUI.personalSummary(row);
check('runtime summary counts current and ownerless legacy rows but excludes foreign account',first.count===5,JSON.stringify(first));
check('runtime summary ignores corrupt signal values while keeping valid signals',Math.abs(first.avg-3.5)<1e-9,String(first.avg));
check('runtime summary ignores malformed clock for best-time bucket',first.best==='00:00–04:00',first.best);

const indexA=R.stationDetailUI.personalHistoryIndex();
const indexB=R.stationDetailUI.personalHistoryIndex();
check('runtime personal index is reused while source and account are unchanged',indexA===indexB);

R.logs.push({user_id:'u1',band:'MW',frequency:600,station:'Test MW',signal_strength:1,time:'01:40'});
const stale=R.stationDetailUI.personalSummary(row);
check('same-array mutation stays cached until a canonical record invalidation event',stale.count===5,String(stale.count));
handlers.get('record:saved')?.();
const refreshed=R.stationDetailUI.personalSummary(row);
check('record save invalidation rebuilds personal history index',refreshed.count===6,String(refreshed.count));
check('rebuilt personal average includes the newly valid signal',Math.abs(refreshed.avg-3)<1e-9,String(refreshed.avg));

const favorite=R.stationDetailUI.favoriteState(row);
check('runtime favorite state resolves through shared favorite index',favorite.active===true&&sharedFavoriteCalls===1,String(sharedFavoriteCalls));

delete R.favoriteVisibilityUI;
R.favorites=[{user_id:'u1',guide_entry_id:'g1'}];
const fallbackFavorite=R.stationDetailUI.favoriteState(row);
check('favorite state keeps a safe fallback before shared UI is available',fallbackFavorite.active===true);

R.me={id:'u2'};
handlers.get('auth:changed')?.();
const switched=R.stationDetailUI.personalSummary(row);
check('account transition rebuild excludes previous account rows',switched.count===1,JSON.stringify(switched));

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} station-detail history-index checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));