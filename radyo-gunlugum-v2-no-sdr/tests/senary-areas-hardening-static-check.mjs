import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

const guide=read('app-guide-service.js');
const locale=read('app-broadcast-locale.js');
const smart=read('app-smart-analyzer.js');
const sw=read('sw.js');
const pwa=read('app-pwa-updates.js');
const auth=read('app-auth-service.js');

for(const [file,src] of [['app-guide-service.js',guide],['app-broadcast-locale.js',locale],['app-smart-analyzer.js',smart],['sw.js',sw],['app-pwa-updates.js',pwa],['app-auth-service.js',auth]]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

// Guide and schedule consistency.
check('guide scoring recognizes raw schedule metadata as time evidence',guide.includes('timed=!!scheduleMeta(e)||(Array.isArray(e?.time_ranges)&&e.time_ranges.length)'));
check('guide history is scoped to the active account',guide.includes('x?.user_id!=null&&x.user_id!==userId'));
check('guide history accepts only personal 1-5 signal values',guide.includes('signal<1||signal>5'));
check('guide history rejects non-positive frequencies',guide.includes('f<=0'));
check('guide history cache keys account identity as well as log array',guide.includes('historyUserId')&&guide.includes('userId===historyUserId'));
check('broadcast locale no longer turns equal non-all-day times into 24 hours',locale.includes("if(!s.all_day&&start===end)return'Saat aralığı kaynakta belirsiz'"));
check('broadcast locale keeps explicit all-day schedules',locale.includes("if(s.all_day||endAbs-start>=1440)return'24 saat · Türkiye saati'"));

// Smart analyzer alignment.
check('smart analyzer zero-duration fallback range is inactive',smart.includes('if(a===b)return false'));
check('smart analyzer penalizes inactive raw schedules',smart.includes("else if(e.time_ranges?.length||e.raw?.schedule){score-=12"));
check('smart analyzer reuses canonical target adjustment',smart.includes('canonical?.target')&&smart.includes('canonical.target.score'));

// Atomic PWA update integrity.
check('service worker requires every local JavaScript module',sw.includes("REQUIRED_LOCAL=new Set(LOCAL.filter(u=>u.endsWith('.js')"));
check('service worker treats external libraries as opportunistic cache entries',!sw.includes('REQUIRED_EXTERNAL')&&sw.includes("yerel uygulama önbelleği korunuyor"));
check('service worker deletes incomplete new cache when a required local module fails',sw.includes('requiredLocalFailed.length')&&sw.includes('PWA uygulama modülleri önbelleğe alınamadı'));
check('service worker does not roll back a complete local cache for an external CDN failure',!sw.includes('requiredExternalFailed')&&!sw.includes('PWA zorunlu dış bağımlılığı önbelleğe alınamadı'));
check('PWA updater forgets redundant waiting workers',pwa.includes("if(worker.state==='redundant'){forgetWaiting(worker);return}"));
check('PWA updater clears activation timeout with stale worker',pwa.includes('function forgetWaiting(worker=null)')&&pwa.includes('activationTimer=null;close()'));

// Functional broadcast locale checks.
{
  const R={clock:{today:()=> '2026-09-14'},features:{register(){}},events:{emit(){}}};
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul'},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(locale,sandbox,{filename:'app-broadcast-locale.js'});
  const malformed={time_text:'12:41–12:41',raw:{schedule:{source_timezone:'UTC',start_minute:761,end_minute:761,all_day:false,days_iso:'1234567'}}};
  const allDay={raw:{schedule:{source_timezone:'UTC',start_minute:0,end_minute:0,all_day:true,days_iso:'1234567'}}};
  const normal={raw:{schedule:{source_timezone:'UTC',start_minute:600,end_minute:660,all_day:false,days_iso:'1234567'}}};
  check('equal non-all-day source interval renders as uncertain rather than 24 hours',R.broadcastLocale.scheduleTime(malformed)==='Saat aralığı kaynakta belirsiz');
  check('explicit all-day source interval still renders as 24 hours',R.broadcastLocale.scheduleTime(allDay)==='24 saat · Türkiye saati');
  check('normal UTC source interval still renders a Turkey-time range',R.broadcastLocale.scheduleTime(normal).includes('Türkiye saati')&&!R.broadcastLocale.scheduleTime(normal).includes('belirsiz'));
}

// Functional guide scoring, target relevance and personal-history integrity.
{
  const R={
    me:{id:'u1'},
    logs:[
      {user_id:'u1',band:'SW5',frequency:9500,signal_strength:5},
      {user_id:'u1',band:'SW5',frequency:9505,signal_strength:99},
      {user_id:'u2',band:'SW5',frequency:9500,signal_strength:1},
      {user_id:'u1',band:'SW5',frequency:-1,signal_strength:5}
    ],
    bandProfiles:[],clock:{today:()=> '2026-09-14',time:()=> '14:00',parts:()=>({date:'2026-09-14',hour:14,minute:0})},
    listeningOrigin:()=>({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}),
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),features:{register(){}},events:{emit(){}}
  };
  const bands={SW5:{min:9500,max:9900,unit:'kHz'}};
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36},receiver:{bands}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(guide,sandbox,{filename:'app-guide-service.js'});
  const active={entry_type:'station_target',mode:'SW',band:'SW5',frequency:9500,probability_score:50,country:'G',raw:{schedule:{source_timezone:'UTC',start_minute:600,end_minute:1200,days_iso:'1234567',target:'Eu'}}};
  const activeScore=R.guideService.scoreEntry(active,{date:'2026-09-14',time:'14:00'});
  const inactiveScore=R.guideService.scoreEntry(active,{date:'2026-09-14',time:'23:30'});
  check('raw schedule without time_ranges receives active time bonus',activeScore.active===true&&activeScore.why.some(x=>x.includes('yayın saati eşleşiyor')));
  check('raw schedule without time_ranges receives inactive time penalty',inactiveScore.active===false&&inactiveScore.why.some(x=>x==='yayın saati dışında'));
  check('active raw schedule scores materially above the same inactive schedule',activeScore.score>inactiveScore.score);
  check('guide personal history ignores corrupt and foreign rows',activeScore.history.count===1&&activeScore.history.avg===5);
  const far={...active,country:'CHN',raw:{schedule:{...active.raw.schedule,target:'CHN'}}};
  const nearTarget=R.guideService.targetAdjustment(active),farTarget=R.guideService.targetAdjustment(far);
  check('near Europe target remains positively relevant from Bozköy',nearTarget.score===8&&nearTarget.eligible===true);
  check('foreign domestic target is strongly demoted from Bozköy',farTarget.score===-30&&farTarget.eligible===false);
}

// Functional smart-analyzer ranking uses canonical target relevance.
{
  const elements=new Map();
  const make=(value='')=>({value,textContent:'',innerHTML:'',dataset:{},disabled:false,addEventListener(){},classList:{add(){},remove(){},toggle(){}},closest(){return null}});
  for(const [id,value] of [['#smartResult',''],['#band','SW5'],['#frequency','9500'],['#date','2026-09-14'],['#time','14:00'],['#language',''],['#speechText',''],['#transcript',''],['#analyzeBtn','']])elements.set(id,make(value));
  const document={querySelector:s=>elements.get(s)||null,addEventListener(){}};
  const R={
    me:{id:'u1'},logs:[],bandProfiles:[],clock:{today:()=> '2026-09-14',time:()=> '14:00',parts:()=>({date:'2026-09-14',hour:14,minute:0})},
    listeningOrigin:()=>({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}),norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),esc:v=>String(v??''),
    detect:()=>({language:null,confidence:0}),features:{register(){}},events:{emit(){},on(){}},router:{go(){}},fill(){},
    guideEntries:[]
  };
  const bands={SW5:{min:9500,max:9900,unit:'kHz'}};
  const sandbox={window:{R},document,globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36},receiver:{bands}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(guide,sandbox,{filename:'app-guide-service.js'});
  R.guideEntries=[
    {id:'far',entry_type:'station_target',station:'Domestic Far',mode:'SW',band:'SW5',frequency:9500,probability_score:50,country:'CHN',language_content:'Çince',raw:{schedule:{source_timezone:'UTC',start_minute:600,end_minute:1200,days_iso:'1234567',target:'CHN'}}},
    {id:'near',entry_type:'station_target',station:'Near Europe',mode:'SW',band:'SW5',frequency:9500,probability_score:50,country:'G',language_content:'İngilizce',raw:{schedule:{source_timezone:'UTC',start_minute:600,end_minute:1200,days_iso:'1234567',target:'Eu'}}}
  ];
  vm.runInContext(smart,sandbox,{filename:'app-smart-analyzer.js'});
  elements.get('#analyzeBtn').onclick();
  check('smart analyzer ranks Turkey-relevant target above foreign domestic target',R.lastSmart?.station==='Near Europe');
  check('smart analyzer explanation includes target relevance',elements.get('#smartResult').innerHTML.includes('yayın hedefi Türkiye veya yakın bölgeyle uyumlu'));
}

// Functional service-worker install rollback checks.
{
  const handlers={};const deleted=[];let fail=()=>false;
  const cache={async put(){},async match(){return null}};
  const caches={async open(){return cache},async delete(key){deleted.push(key);return true},async keys(){return['radyo-old','radyo-test-test-build']}};
  const fetch=async url=>{const bad=fail(String(url));return{ok:!bad,status:bad?503:200,clone(){return this}}};
  const self={location:{href:'https://radio.test/'},clients:{async claim(){}},addEventListener(name,fn){handlers[name]=fn},skipWaiting(){}};
  const sandbox={self,caches,fetch,importScripts(){},globalThis:null,RADIO_APP_CONFIG:{cacheVersion:'test',buildId:'test-build'},URL,Promise,Set,Error,console,Response:{error(){return{}}}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(sw,sandbox,{filename:'sw.js'});
  async function installRejected(){let promise;handlers.install({waitUntil(p){promise=p}});try{await promise;return false}catch{return true}}
  fail=url=>url.includes('app-smart-analyzer.js');deleted.length=0;
  check('missing required local JS rejects new service-worker install',await installRejected());
  check('failed required local JS deletes incomplete new cache',deleted.includes('radyo-test-test-build'));
  fail=url=>url.includes('@supabase/supabase-js@2.116.0');deleted.length=0;
  check('missing pinned Supabase client no longer rejects an otherwise complete service-worker install',!(await installRejected()));
  check('failed Supabase CDN cache does not delete the complete local cache',!deleted.includes('radyo-test-test-build'));
  fail=url=>url.includes('leaflet.css');deleted.length=0;
  check('optional Leaflet stylesheet failure does not block an otherwise complete update',!(await installRejected()));
  check('optional external failure does not delete the complete new cache',!deleted.includes('radyo-test-test-build'));
}

// Functional stale waiting-worker cleanup.
{
  let banner=null;
  const later={onclick:null},now={onclick:null};
  const make=tag=>({tag,dataset:{},className:'',id:'',innerHTML:'',setAttribute(){},remove(){if(this===banner)banner=null},querySelector(sel){if(sel==='.app-update-later')return later;if(sel==='.app-update-now')return now;return null}});
  const document={visibilityState:'visible',querySelector:s=>s==='#appUpdateBanner'?banner:null,createElement:make,head:{appendChild(){}},body:{appendChild(x){if(x.id==='appUpdateBanner')banner=x}},addEventListener(){}};
  const swListeners={};
  const navigator={onLine:true,serviceWorker:{controller:{id:'old'},ready:Promise.resolve(null),addEventListener(name,fn){swListeners[name]=fn}}};
  const R={features:{register(){}},events:{emit(){}},uiStatePersistence:{saveDraft(){}},toast(){},reportError(){},recordedBlob:null};
  const sandbox={window:{R,addEventListener(){}},document,navigator,location:{reload(){}},Date,Promise,console,setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){}};
  vm.createContext(sandbox);vm.runInContext(pwa,sandbox,{filename:'app-pwa-updates.js'});
  const worker={state:'installed',postMessage(){}};
  const reg={waiting:worker,addEventListener(){},async update(){}};
  R.pwaUpdates.watch(reg);
  check('PWA updater can hold a live waiting worker',R.pwaUpdates.waiting===worker);
  worker.state='redundant';
  check('redundant waiting worker is explicitly forgettable',R.pwaUpdates.forgetWaiting(worker)===true&&R.pwaUpdates.waiting===null);
  check('forgetting stale waiting worker removes stale update banner',banner===null);
}

// Functional same-account auth refresh stability.
{
  let authState=null,loads=0;const emitted=[];
  const R={
    me:null,logs:[{id:'pre'}],schedules:[{id:'s'}],store:{sync(){}},uiStatePersistence:{saveDraft(){}},features:{register(){}},events:{emit(name,payload){emitted.push([name,payload])}},
    async load(){loads++;R.logs=[{id:'loaded',user_id:'u1'}]},
    S:{auth:{async getSession(){return{data:{session:{user:{id:'u1',email:'a@test'}}},error:null}},onAuthStateChange(cb){authState=cb},async signInWithPassword(){return{data:{},error:null}},async signUp(){return{data:{},error:null}},async signOut(){return{error:null}}}}
  };
  const sandbox={window:{R},queueMicrotask,Promise,Error,console};
  vm.createContext(sandbox);vm.runInContext(auth,sandbox,{filename:'app-auth-service.js'});
  await R.auth.boot();
  const logsAfterBoot=R.logs,authEventsBefore=emitted.filter(x=>x[0]==='auth:changed').length,loadsBefore=loads;
  authState('TOKEN_REFRESHED',{user:{id:'u1',email:'a@test'}});
  await Promise.resolve();await Promise.resolve();
  check('same-account token refresh preserves loaded log array',R.logs===logsAfterBoot);
  check('same-account token refresh does not trigger another data load',loads===loadsBefore);
  check('same-account token refresh does not emit a false account-change event',emitted.filter(x=>x[0]==='auth:changed').length===authEventsBefore);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} senary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));