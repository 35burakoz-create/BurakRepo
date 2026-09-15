import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const core=read('core.js');
const bootstrap=read('app-bootstrap.js');
const current=read('app-current-programs.js');
const search=read('v44-search-rebuild.js');
const density=read('app-page-density.js');
const audio=read('app-audio-safety.js');
const migration=read('sql/20260914_maximal_audit_hardening.sql');
const config=read('app-config.js');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

for(const [name,src] of [['core.js',core],['app-bootstrap.js',bootstrap],['app-current-programs.js',current],['v44-search-rebuild.js',search],['app-page-density.js',density],['app-audio-safety.js',audio]]){
  let ok=true;try{new vm.Script(src,{filename:name})}catch{ok=false}
  check(`syntax ${name}`,ok);
}

check('shared frequency formatter rejects malformed and non-positive values',core.includes("if(!Number.isFinite(n)||n<=0)return''"));
check('bootstrap exposes optional-module recovery after ready',bootstrap.includes('function recover()')&&bootstrap.includes('failed.size?recover()')&&bootstrap.includes("window.addEventListener('online'"));
check('bootstrap forced recovery replaces a failed stale script',bootstrap.includes('if(force&&old){old.remove?.();old=null}')&&bootstrap.includes("await load(src,{force:true})"));
check('bootstrap recovery emits and redraws only after recovered modules',bootstrap.includes("emit?.('bootstrap:recovered'")&&bootstrap.includes("R.renderAll?.('bootstrap-recovered')"));
check('guide loader probes row 50001 instead of rejecting exact boundary',current.includes('.range(MAX_GUIDE_ROWS,MAX_GUIDE_ROWS)')&&current.includes('if((probe.data||[]).length)return{data:null,error:new Error'));
check('current-program fallback history explicitly excludes foreign accounts',current.includes("(!userId||!x?.user_id||x.user_id===userId)"));
check('global search has explicit active-account ownership predicate',search.includes('const ownedLog=x=>')&&search.includes('!x?.user_id||x.user_id===userId'));
check('global search filters indexed log hits by ownership',search.includes("d.kind==='log'&&logs.length<logLimit&&ownedLog(d.raw)"));
check('global search filters guide rows by receiver compatibility',search.includes('const guideCompatible=x=>')&&search.includes('.filter(guideCompatible)'));
check('global search never presents malformed frequency as zero',search.includes("Number.isFinite(n)&&n>0?")&&search.includes("R.v44Search={searchData,fmtFreq,ownedLog,guideCompatible,indexedMatches}"));
check('global search result copy does not claim a limited list is exhaustive',search.includes('sonuç gösteriliyor.'));
check('telemetry returns no account-owned rows while signed out',density.includes("if(!userId)return[]"));
check('telemetry derives latest mapped row instead of trusting array order',density.includes('function latestRow(rows)')&&density.includes('last=latestRow(mapped)'));
check('telemetry receiver band count comes from configured receiver',density.includes('function receiverBandCount()')&&density.includes('value:`${receiverBandCount()} bant`'));
check('audio recovery reuses canonical timezone conversion for legacy wall time',audio.includes('R.guideService?.wallTimeToInstant?.(date,time)'));
check('audio recovery explicitly excludes foreign-account log candidates',audio.includes("if(x?.user_id&&x.user_id!==userId)continue"));
check('audio recovery modal has an accessible labelled title',audio.includes("aria-labelledby','appAudioModalTitle'")&&audio.includes('id="appAudioModalTitle"'));
check('PWA generation follows current Radio Browser release',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-51'"));

check('migration removes duplicate AI foreign keys',migration.includes('drop constraint if exists radio_ai_analyses_log_id_fkey')&&migration.includes('drop constraint if exists radio_ai_analyses_same_user_log_fkey'));
check('migration removes duplicate session-attempt foreign keys',migration.includes('drop constraint if exists radio_session_attempts_session_id_fkey')&&migration.includes('drop constraint if exists radio_session_attempts_same_user_session_fkey'));
check('migration removes redundant favorite unique index',migration.includes('drop index if exists public.radio_favorites_user_guide_unique'));
check('migration covers canonical same-user foreign keys with indexes',migration.includes('radio_logs_session_user_idx')&&migration.includes('radio_session_attempts_user_session_idx'));
check('database session lifecycle requires ended_at to match status',migration.includes('radio_listening_sessions_status_ended_consistency')&&migration.includes("status = 'active' and ended_at is null")&&migration.includes("status = 'completed' and ended_at is not null"));
check('database blocks attempts after a session is no longer active',migration.includes('radio_guard_active_session_attempt')&&migration.includes("s.status = 'active'")&&migration.includes('radio_session_attempts_active_session_guard'));
check('AI analyses snapshot the log inputs they analyzed',migration.includes('add column if not exists log_date')&&migration.includes('add column if not exists log_time')&&migration.includes('add column if not exists log_band')&&migration.includes('add column if not exists log_frequency'));
check('AI insert trigger captures canonical log snapshot',migration.includes('radio_ai_capture_log_snapshot')&&migration.includes('new.audio_path'));
check('AI completion trigger rejects stale long-running work',migration.includes('radio_ai_guard_snapshot_update')&&migration.includes("new.status = 'completed'")&&migration.includes("raise exception 'Günlük kaydı analiz sırasında değişti; analizi yeniden başlat.'"));
check('log edits invalidate running and completed AI analyses',migration.includes('radio_ai_invalidate_on_log_change')&&migration.includes("status in ('running', 'completed')"));
check('database receiver constraints cover reminders',migration.includes('radio_reminders_receiver_frequency_range')&&migration.includes('radio_reminders_unit_check'));
check('database receiver constraints cover dial calibrations',migration.includes('radio_dial_calibrations_receiver_frequency_range')&&migration.includes('radio_dial_calibrations_unit_consistency'));
check('database receiver constraints cover favorites without forbidding null legacy fields',migration.includes('radio_favorites_frequency_check')&&migration.includes('frequency is null'));
check('new trigger functions pin an empty search path',migration.match(/set search_path = ''/g)?.length>=4);
check('new trigger functions do not introduce SECURITY DEFINER bypasses',!migration.toLowerCase().includes('security definer'));

// Functional shared frequency formatting.
{
  const context={window:{},supabase:{createClient:()=>({})},document:{documentElement:{dataset:{}},title:''},URL,Blob,setTimeout:()=>0,Number,String,Object,Date};
  vm.runInNewContext(core,context,{filename:'core.js'});
  check('functional shared formatter preserves valid FM frequency',context.window.R.freq({frequency:99.5,band:'FM'}).includes('99,5')&&context.window.R.freq({frequency:99.5,band:'FM'}).endsWith('MHz'));
  check('functional shared formatter rejects NaN zero and negative frequency',context.window.R.freq({frequency:'bad',band:'MW'})===''&&context.window.R.freq({frequency:0,band:'MW'})===''&&context.window.R.freq({frequency:-1,band:'MW'})==='');
}

// Functional search isolation and receiver filtering.
{
  const document={querySelector:()=>null,createElement:()=>({dataset:{},classList:{add(){},remove(){}},addEventListener(){},append(){},setAttribute(){}}),head:{appendChild(){}},documentElement:{classList:{add(){},remove(){}}},body:{append(){}} ,addEventListener(){}};
  class ElementStub{};class HTMLElementStub{};
  const R={me:{id:'u1'},logs:[{id:'own',user_id:'u1',station:'Alpha Own',band:'MW',frequency:1000},{id:'foreign',user_id:'u2',station:'Alpha Foreign',band:'MW',frequency:1000},{id:'legacy',station:'Beta Legacy',band:'FM',frequency:95}],guideEntries:[{id:'g1',station:'Guide Good',band:'SW5',mode:'SW',frequency:9500},{id:'g2',station:'Guide Bad',band:'SW99',mode:'SW',frequency:9999}],guideService:{receiverCompatible:x=>x.band!=='SW99'},norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),store:null,events:{on(){}},router:{},switch(){}};
  const context={window:{R,addEventListener(){}},document,Element:ElementStub,HTMLElement:HTMLElementStub,Event:class{},Number,String,Array,Object,Map,Set,Math,Date,Intl,setTimeout:()=>0,clearTimeout(){},console};
  vm.runInNewContext(search,context,{filename:'v44-search-rebuild.js'});
  check('functional search ownership accepts owned and ownerless rows only while signed in',R.v44Search.ownedLog(R.logs[0])&&R.v44Search.ownedLog(R.logs[2])&&!R.v44Search.ownedLog(R.logs[1]));
  const alpha=R.v44Search.searchData('Alpha');
  const titles=alpha.groups.flatMap(g=>g.items.map(i=>String(i.title||''))).join('|');
  check('functional global search excludes foreign-account matching station',titles.includes('Alpha Own')&&!titles.includes('Alpha Foreign'));
  check('functional global search rejects unsupported receiver guide row',R.v44Search.guideCompatible(R.guideEntries[0])&&!R.v44Search.guideCompatible(R.guideEntries[1]));
  check('functional global search frequency formatter rejects corrupt data',R.v44Search.fmtFreq({frequency:'NaN',band:'MW'})===''&&R.v44Search.fmtFreq({frequency:0,band:'MW'})==='');
  R.me=null;
  check('functional global search exposes no account logs after sign-out',!R.v44Search.ownedLog(R.logs[0]));
}

// Functional telemetry ownership, ordering and receiver metadata.
{
  const document={querySelector:()=>null,createElement:()=>({dataset:{},setAttribute(){},className:'',innerHTML:''}),head:{appendChild(){}},addEventListener(){}};
  const R={me:{id:'u1'},logs:[],events:{on(){}},router:{current:()=> 'home'},features:{register(){}},clock:{today:()=> '2026-09-14'}};
  const context={window:{R},document,RADIO_APP_CONFIG:{receiver:{bands:{FM:{},MW:{}}}},Number,String,Array,Object,Map,Set,Math,Date,Intl,setTimeout:()=>0,clearTimeout(){},console};
  vm.runInNewContext(density,context,{filename:'app-page-density.js'});
  const rows=[{id:'late',user_id:'u1',date:'2026-09-14',time:'20:00'},{id:'foreign',user_id:'u2',date:'2026-09-15',time:'20:00'},{id:'early',user_id:'u1',date:'2026-09-13',time:'20:00'},{id:'legacy',date:'2026-09-12',time:'20:00'}];
  check('functional telemetry excludes foreign row while signed in',R.pageDensity.ownedRows(rows).map(x=>x.id).join(',')==='late,early,legacy');
  check('functional telemetry derives actual newest row from unsorted input',R.pageDensity.latestRow([rows[2],rows[0]]).id==='late');
  check('functional telemetry reports configured receiver band count',R.pageDensity.receiverBandCount()===2);
  R.me=null;
  check('functional telemetry returns no private rows while signed out',R.pageDensity.ownedRows(rows).length===0);
}

// Functional audio recovery: canonical historical wall-time conversion and ownership.
{
  const document={querySelector:()=>null,createElement:()=>({}),body:{append(){} }};
  let wallCalls=0;
  const R={me:{id:'u1'},logs:[{id:'own',user_id:'u1',date:'2015-01-15',time:'12:00'},{id:'foreign',user_id:'u2',created_at:'2015-01-15T10:01:00Z'}],guideService:{wallTimeToInstant:(date,time)=>{wallCalls++;return date==='2015-01-15'&&time==='12:00'?new Date('2015-01-15T10:00:00Z'):null}},events:{on(){}},features:{register(){}}};
  const context={window:{R,scrollTo(){},open(){}},document,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul'},Number,String,Array,Object,Map,Set,Math,Date,Intl,setTimeout:()=>0,clearTimeout(){},alert(){},console};
  vm.runInNewContext(audio,context,{filename:'app-audio-safety.js'});
  check('functional audio legacy timestamp uses timezone-aware wall-time helper',R.audioSafety.logInstant(R.logs[0])===Date.parse('2015-01-15T10:00:00Z')&&wallCalls>0);
  const nearest=R.audioSafety.closestRecentLog('2015-01-15T10:01:00Z',5);
  check('functional audio recovery ignores closer foreign-account log',nearest?.log?.id==='own');
}

// Functional exact-boundary guide pagination.
function currentContext(overLimit=false){
  const row={id:'row',entry_type:'station_target',mode:'FM',band:'FM',frequency:90};
  const db={from(){const q={select(){return q},eq(){return q},order(){return q},async range(from){if(from===50000)return{data:overLimit?[{id:'extra'}]:[],error:null};return{data:Array(1000).fill(row),error:null}}};return q}};
  const R={S:db,me:null,guideEntries:[],guideRules:[],bandProfiles:[],logs:[],events:{on(){},emit(){}},features:{register(){}},store:{sync(){}},norm:v=>String(v??'').toLowerCase()};
  const context={window:{R},RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',receiver:{bands:{FM:{min:76,max:108}}}},Number,String,Array,Object,Map,Set,Math,Date,Intl,Promise,setTimeout:()=>0,clearTimeout(){},console};
  vm.runInNewContext(current,context,{filename:'app-current-programs.js'});return R;
}
{
  const exact=await currentContext(false).currentPrograms.fetchAllGuideEntries();
  check('functional guide loader accepts exactly 50000 rows',!exact.error&&exact.data?.length===50000);
  const overflow=await currentContext(true).currentPrograms.fetchAllGuideEntries();
  check('functional guide loader rejects row 50001 instead of silently truncating',!!overflow.error&&overflow.data===null&&String(overflow.error.message).includes('sessizce kesilmedi'));
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} maximal-audit hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
