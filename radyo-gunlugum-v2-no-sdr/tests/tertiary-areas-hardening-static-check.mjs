import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

const qsl=read('app-qsl-service.js');
const qslUI=read('app-qsl-ui.js');
const achievements=read('app-achievements-service.js');
const collection=read('app-collection-ui.js');
const propagation=read('app-propagation.js');
const listening=read('app-listening-service.js');
const listeningUI=read('app-listening-ui.js');
const queueStart=listening.indexOf('function queue('),queueEnd=listening.indexOf('async function runStartSession',queueStart),queueSource=queueStart>=0&&queueEnd>queueStart?listening.slice(queueStart,queueEnd):'';

for(const [file,src] of [
  ['app-qsl-service.js',qsl],['app-qsl-ui.js',qslUI],['app-achievements-service.js',achievements],
  ['app-collection-ui.js',collection],['app-propagation.js',propagation],['app-listening-service.js',listening],['app-listening-ui.js',listeningUI]
]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

// QSL integrity and mutation ordering.
check('QSL validates real calendar dates',qsl.includes('function strictDate(value)')&&qsl.includes('x.getUTCFullYear()===y'));
check('QSL validates real clock times',qsl.includes('function strictTime(value)')&&qsl.includes('Number(m[2])<=59'));
check('QSL contact directory is paged instead of silently capped at 1000',qsl.includes('MAX_CONTACT_ROWS=5000')&&qsl.includes('.range(from,from+CONTACT_PAGE_SIZE-1)')&&!qsl.includes('.limit(1000)'));
check('QSL malformed contacts cannot be persisted',qsl.includes('EMAIL_RE.test(email)?email:url')&&qsl.includes('geçerli bir e-posta adresi veya HTTPS'));
check('QSL planned state clears stale sent and received dates',qsl.includes("{qsl_status:'planned',qsl_sent_at:null,qsl_received_at:null}"));
check('QSL sent state clears stale received date',qsl.includes("{qsl_status:'sent',qsl_sent_at:today,qsl_received_at:null}"));
check('QSL record mutations are serialized per account and log',qslUI.includes('mutationFlights=new Map()')&&qslUI.includes('const key=`${userId}|${id}`')&&qslUI.includes('mutationFlights.has(key)'));

// Achievement and collection legacy-data guards.
check('achievement streak ignores impossible calendar dates',achievements.includes('.filter(validDate)')&&achievements.includes('function validDate(value)'));
check('night achievement requires a valid HH:MM value',achievements.includes('function hourOf(x)')&&achievements.includes('h!=null&&h<5'));
check('collection hides invalid unlock timestamps',collection.includes('function unlockedDate(value)')&&collection.includes("Number.isNaN(d.getTime())?'':"));

// Propagation account/data integrity.
check('propagation attempt pagination pins one user id',propagation.includes('async function loadAttempts(userId=R.me?.id)')&&propagation.includes(".eq('user_id',userId)"));
check('propagation personal-history flights are keyed by account',propagation.includes('attemptFlights=new Map()')&&propagation.includes('attemptFlights.has(userId)'));
check('propagation reuses listening attempts only for the same account',propagation.includes('R.listening?.state?.userId===userId'));
check('propagation has an explicit large-history safety ceiling',propagation.includes('MAX_PERSONAL_ATTEMPTS=50000')&&propagation.includes('veri sessizce kesilmedi'));
check('malformed attempt timestamps no longer affect every hour',!propagation.includes('invalidAttemptBuckets')&&propagation.includes('if(Number.isNaN(d.getTime()))continue'));
check('propagation signal averages only use personal 1-5 values',propagation.includes('signal>=1&&signal<=5'));
check('propagation clears personal history on account transitions',propagation.includes("R.events?.on?.('auth:changed',()=>{resetPersonalHistory()})"));

// Smart listening and calibration integrity.
check('listening result writes are coalesced',listening.includes('recordFlights=new Map()')&&listening.includes('recordFlights.has(key)'));
check('listening partial log failure is returned instead of throwing duplicate-prone retry state',listening.includes('let log=null,logError=null')&&listening.includes('return{attempt:a.data||attempt,log,logError,session}'));
check('legacy session coordinates are range checked',listening.includes('lat>=-90&&lat<=90')&&listening.includes('lon>=-180&&lon<=180'));
check('calibration frequency is checked against receiver limits',listening.includes("Gerçek frekans TECSUN R-9012’nin bu banttaki ayarlanabilir aralığının dışında."));
check('calibration deletion verifies ownership result',listening.includes(".select('id').maybeSingle()")&&listening.includes('Kalibrasyon noktası bulunamadı veya bu hesaba ait değil.'));
check('listening queue dedupe is Set based',queueSource.includes('tried=new Set(')&&queueSource.includes('seen=new Set()')&&!queueSource.includes('findIndex'));
check('listening UI reports partial save explicitly',listeningUI.includes('saved?.logError')&&listeningUI.includes('st.textContent=saved.logError'));
check('listening UI locks calibration and session-end mutations',listeningUI.includes('if(save.disabled)return;save.disabled=true')&&listeningUI.includes('if(button?.disabled)return;if(button)button.disabled=true'));

// Functional QSL checks, including database patches.
{
  const patches=[];let updates=0;
  const R={
    me:{id:'u1'},clock:{today:()=> '2026-09-14'},load:async()=>{},
    guideService:{wallTimeToInstant:(date,time)=>new Date(`${date}T${time}:00+03:00`)},
    events:{emit(){}},features:{register(){}},
    S:{from(){return{update(patch){updates++;patches.push(patch);return this},eq(){return this},select(){return this},async maybeSingle(){return{data:{id:'l1'},error:null}}}}}
  };
  const sandbox={window:{R},globalThis:null,Intl,Date,Math,Number,String,Array,Object,Set,Promise,console};
  sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',origin:{name:'Bozköy'},receiver:{model:'TECSUN R-9012'}};
  vm.createContext(sandbox);vm.runInContext(qsl,sandbox,{filename:'app-qsl-service.js'});
  check('leap-day validator accepts a real leap day',R.qslService.strictDate('2024-02-29')===true);
  check('leap-day validator rejects a non-leap day',R.qslService.strictDate('2026-02-29')===false);
  check('calendar validator rejects April 31',R.qslService.strictDate('2026-04-31')===false);
  check('clock validator accepts 23:59',R.qslService.strictTime('23:59')===true);
  check('clock validator rejects 24:00 and 03:99',R.qslService.strictTime('24:00')===false&&R.qslService.strictTime('03:99')===false);
  check('invalid QSL date is not normalized into another month',R.qslService.formatDate('2026-02-31')==='2026-02-31');
  const badReport=R.qslService.report({station:'Test',date:'2026-02-31',time:'12:00',band:'SW9',frequency:17650});
  check('invalid QSL date is omitted from the report',!badReport.includes('• Date:'));
  await R.qslService.setStatus('l1','planned');
  await R.qslService.setStatus('l1','sent');
  check('functional planned transition clears historical timestamps',patches[0]?.qsl_status==='planned'&&patches[0]?.qsl_sent_at===null&&patches[0]?.qsl_received_at===null);
  check('functional sent transition clears old received timestamp',patches[1]?.qsl_status==='sent'&&patches[1]?.qsl_sent_at==='2026-09-14'&&patches[1]?.qsl_received_at===null);
  const before=updates;let rejected=false;try{await R.qslService.saveContact('l1',{contact_url:'ftp://example.test/qsl'})}catch{rejected=true}
  check('invalid contact is rejected before a database update',rejected&&updates===before);
  await R.qslService.saveContact('l1',{contact_url:'https://example.test/qsl'});
  check('valid HTTPS contact can still be persisted',updates===before+1&&patches.at(-1)?.qsl_contact==='https://example.test/qsl');
}

// Functional achievement checks with malformed legacy rows.
{
  const R={logs:[],norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),events:{on(){},emit(){}},features:{register(){}}};
  const sandbox={window:{R},Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  vm.createContext(sandbox);vm.runInContext(achievements,sandbox,{filename:'app-achievements-service.js'});
  R.logs=[
    {date:'2026-09-10',time:'22:00',band:'SW5'},
    {date:'2026-09-11',time:'03:99',band:'MW'},
    {date:'2026-09-12',time:'12:00',band:'FM'},
    {date:'2026-02-30',time:'01:00',band:'MW'}
  ];
  check('achievement streak counts three real consecutive dates only',R.achievementsService.stats().maxStreak===3);
  check('achievement hour parser accepts 03:59',R.achievementsService.hourOf({time:'03:59'})===3);
  check('achievement hour parser rejects malformed minutes and 24:00',R.achievementsService.hourOf({time:'03:99'})===null&&R.achievementsService.hourOf({time:'24:00'})===null);
  const night=R.achievementDefs.find(x=>x.key==='night_owl');
  R.logs=[{date:'2026-09-11',time:'03:99',band:'MW'}];
  check('malformed night time cannot unlock Gece MW',night.test(R.achievementsService.stats())===false);
}

// Functional propagation checks, including an account switch between pages.
{
  const nodes=[];
  const el=()=>({dataset:{},className:'',appendChild(x){nodes.push(x)},insertBefore(){},querySelector(){return null},innerHTML:'',addEventListener(){}});
  const document={querySelector(){return null},createElement:el,head:{appendChild(){}},addEventListener(){},querySelectorAll(){return[]}};
  const storage=new Map();
  const queried=[];let page=0;
  const R={
    me:{id:'u1'},logs:[],norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
    events:{on(){},emit(){}},features:{register(){}},router:{register(){},current(){return'home'}},
    reportError(){},listeningOrigin:()=>({name:'Bozköy',lat:38.151,lon:27.36}),
    S:{from(){return{select(){return this},eq(_k,v){queried.push(v);return this},order(){return this},async range(){page++;if(page===1){R.me={id:'u2'};return{data:Array.from({length:1000},()=>({band:'SW5',result:'heard',attempted_at:'2026-09-14T07:00:00Z'})),error:null}}return{data:[],error:null}}}}}
  };
  const sandbox={window:{R},document,globalThis:null,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},fetch:async()=>({ok:false,status:500,json:async()=>({})}),Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0},setInterval(){return 0}};
  sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',origin:{name:'Bozköy',lat:38.151,lon:27.36}};
  vm.createContext(sandbox);vm.runInContext(propagation,sandbox,{filename:'app-propagation.js'});
  check('propagation valid log hour accepts 23:59',R.propagation.validLogHour('23:59')===23);
  check('propagation valid log hour rejects malformed times',R.propagation.validLogHour('10:99')===null&&R.propagation.validLogHour('99:00')===null);
  R.logs=[
    {band:'SW5',time:'10:05',signal_strength:4},
    {band:'SW5',time:'10:05',signal_strength:99},
    {band:'SW5',time:'10:99',signal_strength:5}
  ];
  const personal=R.propagation.personalStats('SW5',10);
  check('propagation excludes malformed times from personal log buckets',personal.logs===2);
  check('propagation excludes corrupt signal values from personal average',personal.avg===4);
  const rows=await R.propagation.loadAttempts('u1');
  check('propagation keeps the initiating account on every pagination request',queried.length===2&&queried.every(x=>x==='u1'));
  check('late propagation history is discarded after account switch',Array.isArray(rows)&&rows.length===0);
}

// Functional smart-listening checks.
{
  let attemptInserts=0,logInserts=0,dbCalls=0;
  const R={
    me:null,logs:[],norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
    events:{on(){},emit(){}},features:{register(){}},clock:{local:()=>({date:'2026-09-14',time:'12:00'})},
    listeningOrigin:()=>({name:'Bozköy',lat:38.151,lon:27.36}),load:async()=>{},reportError(){},
    guideService:{receiverCompatible:e=>Number(e?.frequency)>=17550&&Number(e?.frequency)<=17900},
    currentSuggestions:()=>[
      {id:'g1',mode:'SW',band:'SW9',frequency:17650,station:'Test'},
      {id:'g2',mode:'SW',band:'SW9',frequency:17650,station:'Test'},
      {id:'g3',mode:'SW',band:'SW9',frequency:17700,station:'Other'}
    ],
    S:{from(table){dbCalls++;return{insert(){if(table==='radio_session_attempts')attemptInserts++;if(table==='radio_logs')logInserts++;return this},select(){return this},single:async()=>table==='radio_logs'?(()=>{R.me={id:'u2'};return{data:null,error:{message:'log failed'}}})():({data:{id:'a1'},error:null}),eq(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:null,error:null}),range:async()=>({data:[],error:null})}}}
  };
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{origin:{name:'Bozköy',lat:38.151,lon:27.36}},Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0}};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(listening,sandbox,{filename:'app-listening-service.js'});
  const invalidDifferent=R.listening.coordinatesForSession({location:'Başka yer',latitude:999,longitude:27},{name:'Bozköy',lat:38.151,lon:27.36});
  check('invalid legacy session coordinates are not copied to another location',invalidDifferent.lat===null&&invalidDifferent.lon===null);
  const invalidSame=R.listening.coordinatesForSession({location:'Bozköy',latitude:999,longitude:27},{name:'Bozköy',lat:38.151,lon:27.36});
  check('invalid same-location coordinates can fall back to valid listening origin',invalidSame.lat===38.151&&invalidSame.lon===27.36);
  R.me={id:'u1'};R.listening.state.userId='u1';R.listening.state.loaded=true;R.listening.state.activeSession={id:'s1',status:'active',location:'Bozköy',latitude:38.151,longitude:27.36};R.listening.state.sessions=[R.listening.state.activeSession];R.listening.state.attempts=[];
  const queue=R.listening.queue(R.listening.state.activeSession);
  check('functional listening queue collapses duplicate station-frequency candidates',queue.length===2&&queue[0].station==='Test'&&queue[1].station==='Other');
  const beforeDb=dbCalls;let calRejected=false;try{await R.listening.addCalibration({band:'SW9',actualFrequency:18000,dialReading:18})}catch{calRejected=true}
  check('out-of-range calibration is rejected before database write',calRejected&&dbCalls===beforeDb);
  const saved=await R.listening.recordAttempt({id:'g1',mode:'SW',band:'SW9',frequency:17650,station:'Test'},'heard',{signalStrength:4});
  check('attempt remains saved when daily log creation fails',attemptInserts===1&&logInserts===1&&saved?.attempt?.id==='a1');
  check('partial daily-log failure resolves with an explicit logError',typeof saved?.logError==='string'&&saved.logError.includes('günlük kaydı oluşturulamadı'));
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} tertiary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
