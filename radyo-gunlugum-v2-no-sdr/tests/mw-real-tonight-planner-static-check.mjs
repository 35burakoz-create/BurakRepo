import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sql=read('sql/20260916_mw_real_tonight_planner.sql');
const service=read('app-radio-console-service.js');
const guide=read('app-mw-guide-ui.js');
const sw=read('sw.js');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

check('tonight RPC is a separate authenticated security-invoker function',
  sql.includes('FUNCTION public.radio_mw_tonight_candidates(p_limit integer DEFAULT 120)')&&
  sql.includes('SECURITY INVOKER')&&sql.includes("SET search_path TO ''")&&
  sql.includes('REVOKE EXECUTE ON FUNCTION public.radio_mw_tonight_candidates(integer) FROM PUBLIC')&&
  sql.includes('REVOKE EXECUTE ON FUNCTION public.radio_mw_tonight_candidates(integer) FROM anon')&&
  sql.includes('GRANT EXECUTE ON FUNCTION public.radio_mw_tonight_candidates(integer) TO authenticated'));
check('tonight window uses astronomical solar threshold with explicit local fallback',
  sql.includes('radio_solar_elevation_deg')&&sql.includes('<= -0.833')&&
  sql.includes("v_window_source := 'astronomik'")&&sql.includes("v_window_source := 'yerel saat yedeği'")&&
  sql.includes("time '18:00'")&&sql.includes("time '07:00'"));
check('astronomical boundaries are refined beyond coarse samples',
  sql.includes("interval '15 minutes'")&&
  (sql.match(/FOR v_i IN 1\.\.12 LOOP/g)||[]).length===2&&
  sql.includes('v_mid := v_lo + (v_hi - v_lo) / 2'));
check('broadcast eligibility uses exact interval overlap rather than point sampling',
  sql.includes('o.occurrence_start < v_night_end')&&
  sql.includes('o.occurrence_end > v_plan_start')&&
  sql.includes('greatest(o.occurrence_start, v_plan_start)')&&
  sql.includes('least(o.occurrence_end, v_night_end)'));
check('schedule occurrence logic preserves UTC day, validity, weekday and cross-midnight semantics',
  sql.includes("AT TIME ZONE 'UTC'")&&
  sql.includes('s.valid_from IS NULL OR s.valid_from <= d.broadcast_date')&&
  sql.includes('s.valid_to IS NULL OR s.valid_to >= d.broadcast_date')&&
  sql.includes("coalesce(nullif(s.days_iso, ''), '1234567')")&&
  sql.includes('(d.broadcast_date + 1)::timestamp')&&
  sql.includes('s.start_minute = s.end_minute THEN NULL'));
check('tonight plan starts at now during an already-running night',sql.includes('v_plan_start := greatest(v_now, v_night_start)'));
check('tonight score keeps target, history and favorite intelligence',
  sql.includes('radio_target_adjustment_geo_values')&&
  sql.includes('personal_history_adjustment')&&
  sql.includes('THEN 4 ELSE 0 END AS favorite_bonus')&&
  sql.includes('b.favorite_bonus + 8'));
check('tonight result carries explicit schedule and night-window metadata',
  sql.includes('scheduled_tonight boolean')&&sql.includes('tonight_start_at timestamptz')&&
  sql.includes('night_window_start timestamptz')&&sql.includes('night_window_source text')&&
  sql.includes("'bu gece EiBi çizelgesinde '")&&sql.includes("'astronomik gece '"));
check('tonight RPC has a bounded candidate limit',sql.includes("least(coalesce(p_limit, 120), 300)"));

check('radio console has independent now and tonight RPC caches',
  service.includes("R.S.rpc('radio_mw_now_candidates',{p_limit:n})")&&
  service.includes("R.S.rpc('radio_mw_tonight_candidates',{p_limit:n})")&&
  service.includes('tonightCacheRows=[]')&&service.includes('tonightCacheAt=0')&&
  service.includes('function tonightRows()'));
check('tonight cache emits its own readiness event and invalidates with recommendation inputs',
  service.includes("R.events?.emit?.('radio-console:mw-tonight-ready'")&&
  service.includes('function invalidateCandidateCaches(){cacheAt=0;tonightCacheAt=0}')&&
  service.includes("R.events?.on?.('favorites:changed',requestRefresh)"));
check('service normalizes tonight metadata without changing current active semantics',
  service.includes('scheduled_tonight:!!row.scheduled_tonight')&&
  service.includes('active_now:!!row.active_now')&&service.includes('night_window_source:clean(row.night_window_source)'));
check('intelligence parser recognizes astronomical-night explanation',
  service.includes("lower(x).startsWith('astronomik gece ')")&&
  service.includes("lower(x).startsWith('gece penceresi ')")&&
  service.includes("propagationText.startsWith('astronomik gece ')")&&
  service.includes("propagationText.startsWith('gece penceresi ')"));

check('MW guide night scope is schedule-backed rather than Gece DX class-backed',
  guide.includes("if(scope==='night')return!!row?.scheduled_tonight")&&
  guide.includes('R.radioConsole?.tonightRows?.()')&&
  !guide.includes("scope==='night')return classKey==='dx"));
check('Gece DX remains an independent reception-class filter',guide.includes("['dx','Gece DX']"));
check('MW guide lazily loads tonight candidates only in favorite mode',
  guide.includes('if(favoriteOnly&&R.radioConsole?.loadMwTonight)')&&
  guide.includes('await R.radioConsole.loadMwTonight({limit:300,force})'));
check('night cards expose the scheduled local time',
  guide.includes('function tonightScheduleChip(row)')&&guide.includes('row.tonight_start_at')&&
  guide.includes('row.tonight_end_at')&&guide.includes('çizelgede'));
check('night scope explains astronomical schedule intersection without reception promise',
  guide.includes('EiBi A26 yayın çizelgesi ile dinleme konumundaki astronomik gece kesişir; alımı garanti etmez.')&&
  guide.includes('18.00–07.00 yerel saat yedeğiyle hesaplandı; alımı garanti etmez.'));
check('night scope has a distinct schedule-load failure state',
  guide.includes('tonightLoadFailed')&&guide.includes('Bu gece çizelgesi alınamadı. Bağlantıyı kontrol edip yeniden dene.'));
check('PWA generation marks the real tonight planner',sw.includes("MW_REAL_TONIGHT_PLANNER='20260916-13'"));

const rpcCalls=[];
const emitted=[];
const R={
  me:{id:'u1'},
  S:{async rpc(name,args){rpcCalls.push([name,args]);if(name==='radio_mw_tonight_candidates')return{data:[{schedule_id:'night-1',frequency:900,station:'Gece Test',reception_class:'Bölgesel',active_now:false,scheduled_tonight:true,tonight_start_at:'2026-09-16T19:00:00Z',tonight_end_at:'2026-09-16T20:00:00Z',night_window_source:'astronomik',timezone:'Europe/Istanbul'}],error:null};return{data:[{schedule_id:'now-1',frequency:700,station:'Şimdi Test',reception_class:'Gece DX',active_now:true}],error:null}}},
  events:{on(){},emit(name,payload){emitted.push([name,payload])}},
  features:{register(){}},
  reportError(){},guideEntries:[]
};
const document={querySelector(){return null},createElement(){return{dataset:{}}},head:{appendChild(){}}};
const sandbox={window:{R},R,document,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console};sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(service,sandbox,{filename:'app-radio-console-service.js'});
await R.radioConsole.loadMw({limit:60});
await R.radioConsole.loadMwTonight({limit:120});
await R.radioConsole.loadMwTonight({limit:120});
check('runtime current and tonight loaders call different RPCs',rpcCalls.filter(x=>x[0]==='radio_mw_now_candidates').length===1&&rpcCalls.filter(x=>x[0]==='radio_mw_tonight_candidates').length===1);
check('runtime tonight TTL cache avoids duplicate immediate RPC',rpcCalls.length===2);
check('runtime tonight row preserves scheduled flag separately from active now',R.radioConsole.tonightRows()[0]?.scheduled_tonight===true&&R.radioConsole.tonightRows()[0]?.active_now===false);
check('runtime detail lookup can fall back to a tonight-only schedule row',R.radioConsole.get('night-1')?.station==='Gece Test');
check('runtime emits distinct tonight readiness event',emitted.some(([name])=>name==='radio-console:mw-tonight-ready'));

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} MW real-tonight planner checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
