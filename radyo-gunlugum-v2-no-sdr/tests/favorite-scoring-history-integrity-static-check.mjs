import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sql=read('sql/20260916_mw_favorite_preference_scoring.sql');
const service=read('app-radio-console-service.js');
const now=read('app-now-ui.js');
const guide=read('app-mw-guide-ui.js');
const detail=read('app-station-detail-ui.js');
const guideCss=read('app-mw-guide.css');
const sw=read('sw.js');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

for(const [name,src] of [['radio console service',service],['current UI',now],['MW guide',guide],['station detail',detail]]){
  let ok=true,msg='';try{new vm.Script(src,{filename:name})}catch(error){ok=false;msg=error.message}check(`${name} syntax`,ok,msg)
}

check('favorite scoring migration keeps the RPC return shape and auth-scoped user context',sql.includes('CREATE OR REPLACE FUNCTION public.radio_mw_now_candidates')&&sql.includes('v_uid uuid := auth.uid()')&&sql.includes("if v_uid is null then raise exception 'Authentication required'"));
check('favorite scoring reads only the current user MW favorites',sql.includes('favorites as materialized')&&sql.includes('where f.user_id=v_uid')&&sql.includes("upper(btrim(coalesce(f.band,'')))='MW'"));
check('favorite contribution is deliberately bounded to four points',sql.includes('then 4 else 0 end as favorite_bonus')&&sql.includes('+b.favorite_bonus+')&&!sql.includes('then 8 else 0 end as favorite_bonus'));
check('favorite matching prefers canonical station identity with a frequency guard',sql.includes('f.frequency=m.frequency')&&sql.includes('f.canonical_station_id=m.canonical_station_id'));
check('favorite contribution is explicitly present in score explanation',sql.includes("'favori yayın +'||r.favorite_bonus::text"));
check('radio console parses favorite contribution as structured intelligence',service.includes("startsWith('favori yayın')")&&service.includes('favorite:{text:favorite,bonus:bonus(favorite),active:!!favorite}'));
check('favorite changes invalidate and reload MW recommendation scoring',service.includes("R.events?.on?.('favorites:changed',requestRefresh)"));
check('current recommendation hero exposes optional favorite score chip',now.includes("label:'Favorim'")&&now.includes("tone:'favorite'")&&now.includes('intel.favorite?.text'));
check('MW guide exposes favorite score contribution without replacing the favorite toggle',guide.includes('intel.favorite?.bonus')&&guide.includes('♥ favori')&&guide.includes("klass:'favorite'")&&guide.includes('data-mw-favorite'));
check('MW guide visually distinguishes favorite score contribution',guideCss.includes('.mw-guide-tags span.favorite'));
check('station history ignores null and out-of-scale signal values instead of coercing them to zero',detail.includes('signal!==null&&signal>=1&&signal<=5')&&!detail.includes('logs.map(x=>Number(x.signal_strength))'));
check('station history rejects missing or invalid clock values instead of treating them as midnight',detail.includes("time.match(/^([01]?\\d|2[0-3]):([0-5]\\d)/)")&&!detail.includes("Number(String(x.time||'').slice(0,2))"));
check('station detail keeps room for favorite explanation in the reason list',detail.includes('.slice(0,7)'));
check('service worker carries personal favorite scoring release marker',sw.includes("PERSONAL_FAVORITE_SCORING='20260916-8'"));

const links=[];
const serviceR={events:{on(){},emit(){}},features:{register(){}}};
const serviceDocument={querySelector(){return null},createElement(tag){return tag==='script'?{dataset:{},defer:false}:{dataset:{}}},head:{appendChild(node){links.push(node)}}};
const serviceSandbox={window:{R:serviceR},R:serviceR,document:serviceDocument,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console};
serviceSandbox.globalThis=serviceSandbox;
vm.createContext(serviceSandbox);
vm.runInContext(service,serviceSandbox,{filename:'app-radio-console-service.js'});
const intel=serviceR.radioConsole.intelligence({score_explanation:'Gece DX · EiBi çizelgesinde aktif · hedef konum için uygun +3 · bant geçmişi +2 · favori yayın +4 · gece yayılımı'});
check('runtime structured intelligence reads favorite bonus exactly',intel.favorite.active===true&&intel.favorite.bonus===4&&intel.favorite.text==='favori yayın +4',JSON.stringify(intel.favorite));

class ElementStub{}
class HTMLElementStub extends ElementStub{}
const detailListeners=[];
const detailDocument={querySelector(){return null},addEventListener(...args){detailListeners.push(args)},documentElement:{classList:{remove(){},add(){}}},createElement(){return{}}};
const detailR={
  norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
  logs:[
    {band:'MW',frequency:600,station:'Test MW',signal_strength:null,time:null},
    {band:'MW',frequency:600,station:'Test MW',signal_strength:4,time:'21:15'},
    {band:'MW',frequency:600,station:'Test MW',signal_strength:2,time:''},
    {band:'MW',frequency:600,station:'Test MW',signal_strength:null,time:'99:99'}
  ],
  events:{on(){}},features:{register(){}},radioConsole:{},favorites:[]
};
const detailSandbox={window:{R:detailR},R:detailR,document:detailDocument,Element:ElementStub,HTMLElement:HTMLElementStub,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console,setTimeout(){return 1}};
detailSandbox.globalThis=detailSandbox;
vm.createContext(detailSandbox);
vm.runInContext(detail,detailSandbox,{filename:'app-station-detail-ui.js'});
const summary=detailR.stationDetailUI.personalSummary({frequency:600,station:'Test MW'});
check('runtime personal summary averages only actual signal measurements',summary.count===4&&summary.avg===3,JSON.stringify(summary));
check('runtime personal summary ignores missing and malformed times',summary.best==='20:00–00:00',summary.best);

for(const [name,ok,detailText] of checks)console.log(`${ok?'✓':'✗'} ${name}${detailText?` — ${detailText}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} favorite-scoring/history-integrity checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
