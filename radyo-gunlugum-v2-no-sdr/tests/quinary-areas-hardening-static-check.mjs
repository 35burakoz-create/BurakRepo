import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

const achievements=read('app-achievements-service.js');
const users=read('app-user-services.js');
const propagation=read('app-propagation.js');
const qsl=read('app-qsl-service.js');
const qslUI=read('app-qsl-ui.js');
const collection=read('app-collection-ui.js');
for(const [file,src] of [['app-achievements-service.js',achievements],['app-user-services.js',users],['app-propagation.js',propagation],['app-qsl-service.js',qsl],['app-qsl-ui.js',qslUI],['app-collection-ui.js',collection]]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

check('achievement rules use receiver-supported bands',achievements.includes('receiverBands=new Set')&&achievements.includes('function supportedBand(value)'));
check('achievement rules isolate active account rows',achievements.includes('function ownedLogs()')&&achievements.includes('x?.user_id==null||x.user_id===userId'));
check('night-MW achievement uses strict clock parser',achievements.includes('nightMW:logs.some')&&achievements.includes('const h=hourOf(x)'));
check('user services no longer overwrite canonical achievement tests',!users.includes("sw5.test=")&&!users.includes("night.test=")&&!users.includes("jp.test="));
check('user settings failure preserves existing settings instead of applying defaults',users.includes("if(q.error){R.reportError?.(q.error,'user-settings'")&&users.includes('lastSettingsUser===userId&&R.userSettings'));
check('preferences refuse to open fake defaults after load failure',users.includes("if(!s)return toast('Ayarlar şu anda yüklenemedi."));
check('collection paging probes row 50001',users.includes('range(MAX_COLLECTION_ROWS,MAX_COLLECTION_ROWS)')&&users.includes('function userRowsQuery'));
check('collection paging aborts on account transition',users.includes("Oturum değişti; koleksiyon yüklemesi durduruldu."));
check('preference saves are coalesced',users.includes('settingsSaveFlights=new Map()')&&users.includes('settingsSaveFlights.has(userId)'));
check('reminder notifications skip invalid frequencies',users.includes('!Number.isFinite(freq)||freq<=0'));
check('reminder persistence verifies an owned updated row',users.includes(".select('id').maybeSingle()")&&users.includes('Hatırlatıcı bildirim durumu kaydedilemedi.'));

check('propagation origin has coordinate range validation',propagation.includes('function validCoords(lat,lon)')&&propagation.includes('lat>=-90&&lat<=90'));
check('propagation history probes attempt 50001',propagation.includes('range(MAX_PERSONAL_ATTEMPTS,MAX_PERSONAL_ATTEMPTS)'));
check('propagation paging stops on account transition',propagation.includes('if(R.me?.id!==userId)return[]'));
check('propagation rejects zero-duration custom band windows',propagation.includes('a!==b')&&propagation.includes('if(a===b)return false'));
check('propagation personal attempt rate ignores unknown outcomes',propagation.includes("!['heard','weak','none'].includes(x.result)"));
check('propagation render is pinned to initiating account',propagation.includes('const userId=R.me?.id;renderFlight=')&&propagation.includes('if(R.me?.id!==userId){setTimeout'));

check('QSL contact directory probes row 5001',qsl.includes('range(MAX_CONTACT_ROWS,MAX_CONTACT_ROWS)')&&qsl.includes('function contactQuery()'));
check('forced QSL lookup bypasses saved contact before directory refresh',qsl.includes('if(saved&&!force)return saved')&&qsl.includes('return ranked[0]||saved||null'));
check('saved QSL form is not misrepresented as a verification source',qsl.includes('source_url:null,verified_at:null,contact_type:\'saved\''));
check('QSL HTTPS validator uses parsed URLs and rejects credentials',qsl.includes('new URL(raw)')&&qsl.includes('!u.username&&!u.password'));
check('QSL UI distinguishes saved contacts from verified contacts',qslUI.includes('Kaydedilmiş e-posta')&&qslUI.includes('güncelliği doğrulanmamış olabilir'));
check('collection dates use canonical application timezone',collection.includes("timeZone:C.timezone||'Europe/Istanbul'"));
check('collection ignores stale achievement events from another account',collection.includes("x?.userId&&x.userId!==R.me?.id"));

// Functional achievement validation and account isolation.
{
  const R={
    me:{id:'u1'},
    logs:[
      {user_id:'u1',band:'MW',time:'',date:'2026-09-10',signal_strength:3},
      {user_id:'u1',band:'SW99',time:'03:00',date:'2026-09-11',signal_strength:5},
      {user_id:'u2',band:'SW5',time:'03:00',date:'2026-09-12',signal_strength:5}
    ],
    events:{on(){},emit(){}},features:{register(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR')
  };
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{receiver:{bands:{FM:{},MW:{},SW1:{},SW2:{},SW3:{},SW4:{},SW5:{},SW6:{},SW7:{},SW8:{},SW9:{},SW10:{}}}},Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(achievements,sandbox,{filename:'app-achievements-service.js'});
  const s=R.achievementsService.stats();
  check('unsupported SW99 does not count as shortwave achievement data',s.hasSW===false&&s.signalFiveSW===false);
  check('missing MW time does not unlock night-owl condition',s.nightMW===false);
  check('foreign-account log is excluded from achievement statistics',s.logs===2);
  R.logs.push({user_id:'u1',band:'SW5',time:'04:30',date:'2026-09-12',signal_strength:5});
  const s2=R.achievementsService.stats();
  check('valid receiver SW record still qualifies normally',s2.hasSW===true&&s2.signalFiveSW===true);
}

// Functional user-settings failure safety, coordinate fallback and exact paging boundaries.
{
  const store=new Map();let settingsCall=0,rowOverflow=false;
  const chain={select(){return this},eq(){return this},order(){return this},async maybeSingle(){settingsCall++;return settingsCall===1?{data:{user_id:'u1',daily_goal:7,default_location:'Özel',default_latitude:38,default_longitude:27},error:null}:{data:null,error:new Error('network')}}};
  const R={
    me:{id:'u1'},userSettings:null,logs:[],favorites:[],reminders:[],guideEntries:[],achievementDefs:[],
    events:{on(){},emit(){}},features:{register(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
    S:{from(table){if(table==='radio_user_settings')return chain;return{select(){return this},eq(){return this},order(){return this},async range(from){const page=Array.from({length:1000},(_,i)=>({id:from+i,user_id:'u1'}));if(from===50000)return{data:rowOverflow?[{id:'overflow',user_id:'u1'}]:[],error:null};return{data:page,error:null}}}}}
  };
  const node=()=>({dataset:{},querySelector(){return null},querySelectorAll(){return[]},children:[],style:{},appendChild(){},remove(){}});
  const document={querySelector(){return null},querySelectorAll(){return[]},createElement:node,head:{appendChild(){}},body:{append(){}},addEventListener(){},activeElement:null};
  const sandbox={window:{R,Notification:class{},addEventListener(){}},document,navigator:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}},Date,Intl,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,Element:class{},HTMLElement:class{},alert(){},setTimeout(){return 0},setInterval(){return 0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(users,sandbox,{filename:'app-user-services.js'});
  const first=await R.userServices.loadSettings(true,'u1');
  const second=await R.userServices.loadSettings(true,'u1');
  check('settings load keeps last known values when refresh fails',first.daily_goal===7&&second.daily_goal===7&&R.userSettings.daily_goal===7);
  R.userSettings={default_location:'Bozuk',default_latitude:999,default_longitude:999};
  const origin=R.userServices.listeningOrigin();
  check('invalid stored listening coordinates fall back to Bozköy coordinates',origin.lat===38.151&&origin.lon===27.36);
  R.userSettings=first;
  const exact=await R.userServices.fetchUserRows('radio_favorites','created_at',{userId:'u1'});
  check('collection loader accepts exactly 50,000 rows',!exact.error&&exact.data.length===50000);
  rowOverflow=true;
  const overflow=await R.userServices.fetchUserRows('radio_favorites','created_at',{userId:'u1'});
  check('collection loader rejects row 50,001',!!overflow.error&&overflow.data===null);
  const sentinel=()=>true;R.achievementDefs=[{key:'signal_five',test:sentinel},{key:'night_owl',test:sentinel},{key:'japanese',test:sentinel}];R.userServices.patchAchievements();
  check('user-service copy polish no longer replaces achievement predicates',R.achievementDefs.every(x=>x.test===sentinel));
}

// Functional propagation malformed windows, attempt outcomes and exact paging boundaries.
{
  const rootNode={innerHTML:'',querySelector(){return null}},tab={appendChild(){},className:''};
  const document={querySelector:s=>s==='#tab-propagation'?tab:s==='#v41Propagation'?rootNode:null,querySelectorAll(){return[]},createElement(){return{className:'',dataset:{},appendChild(){}}},head:{appendChild(){}},addEventListener(){}};
  const storage=new Map();let overflow=false;
  const page=Array.from({length:1000},(_,i)=>({band:'SW5',frequency:9500,result:'heard',signal_strength:3,attempted_at:'2026-09-14T09:00:00Z',id:i}));
  const R={
    me:{id:'u1'},logs:[],bandProfiles:[{band:'SW1',start_minute:600,end_minute:600,rating:'İyi'}],
    listening:{state:{loaded:true,userId:'u1',attempts:[
      {band:'SW5',result:'heard',attempted_at:'2026-09-14T09:00:00Z'},
      {band:'SW5',result:'unknown',attempted_at:'2026-09-14T09:00:00Z'},
      {band:'SW5',result:'none',attempted_at:'2026-09-14T09:00:00Z'}
    ]}},
    listeningOrigin:()=>({name:'Bozuk',lat:999,lon:999}),events:{on(){},emit(){}},features:{register(){}},router:{register(){},current(){return'home'}},
    S:{from(){return{select(){return this},eq(){return this},order(){return this},async range(from){if(from===50000)return{data:overflow?[{...page[0],id:'overflow'}]:[],error:null};return{data:page,error:null}}}}}
  };
  const sandbox={window:{R},document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}},fetch:async()=>({ok:false,status:500}),Date,Intl,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0},setInterval(){return 0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(propagation,sandbox,{filename:'app-propagation.js'});
  check('propagation invalid origin falls back to configured coordinates',R.propagation.listeningOrigin().lat===38.151&&R.propagation.listeningOrigin().lon===27.36);
  check('zero-duration band profile is ignored',R.propagation.profileBase('SW1',600).label!=='İyi');
  await R.propagation.loadAttempts('u1');
  const ps=R.propagation.personalStats('SW5',12);
  check('unknown propagation attempt result is excluded from denominator',ps.attempts===2&&Math.abs(ps.rate-.5)<1e-9);
  R.listening.state.loaded=false;R.propagation.resetPersonalHistory();
  const exact=await R.propagation.loadAttempts('u1');
  check('propagation accepts exactly 50,000 attempt rows',exact.length===50000);
  overflow=true;R.propagation.resetPersonalHistory();
  const tooMany=await R.propagation.loadAttempts('u1');
  check('propagation rejects a silently truncated 50,001-row history',tooMany.length===0);
}

// Functional QSL URL safety, saved-vs-verified refresh and exact contact boundaries.
{
  let mode='single';const contact={id:1,station_name:'Radio Test',aliases:[],country:'Türkiye',email:'verified@example.com',contact_url:null,source_url:'https://example.com/source',verified_at:'2026-09-01',active:true};
  const fullPage=Array.from({length:500},(_,i)=>({...contact,id:i+1,station_name:`Station ${i}`}));
  const R={me:{id:'u1'},features:{register(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),S:{from(){return{select(){return this},eq(){return this},order(){return this},async range(from){if(mode==='single')return{data:from===0?[contact]:[],error:null};if(from===5000)return{data:mode==='overflow'?[{...contact,id:6000}]:[],error:null};return{data:fullPage,error:null}}}}}};
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{origin:{name:'Bozköy'},timezone:'Europe/Istanbul',receiver:{model:'TECSUN R-9012'}},URL,Date,Intl,Math,Number,String,Array,Object,Map,Set,Promise,Error,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(qsl,sandbox,{filename:'app-qsl-service.js'});
  check('QSL safe URL accepts normal HTTPS URL',R.qslService.safeHttpUrl('https://example.com/contact')==='https://example.com/contact');
  check('QSL safe URL rejects embedded credentials',R.qslService.safeHttpUrl('https://user:pass@example.com/contact')==='');
  check('QSL safe URL rejects malformed or non-HTTPS schemes',R.qslService.safeHttpUrl('javascript:alert(1)')===''&&R.qslService.safeHttpUrl('https://')==='');
  const saved=R.qslService.savedContact({station:'Radio Test',qsl_contact:'https://old.example.com/form'});
  check('saved QSL URL is not exposed as a verification-source link',saved.saved===true&&saved.source_url===null);
  const fresh=await R.qslService.suggestContact({station:'Radio Test',country:'Türkiye',qsl_contact:'old@example.com'},{force:true});
  check('forced QSL lookup prefers fresh verified directory result over saved address',fresh.email==='verified@example.com'&&!fresh.saved);
  mode='exact';const exact=await R.qslService.loadContacts(true);
  check('QSL directory accepts exactly 5,000 rows',exact.length===5000);
  mode='overflow';let threw=false;try{await R.qslService.loadContacts(true)}catch{threw=true}
  check('QSL directory rejects row 5,001',threw);
}

// Functional fixed-timezone collection date rendering.
{
  const document={querySelector(){return null},createElement(){return{dataset:{}}},head:{appendChild(){}},body:{append(){}},addEventListener(){},activeElement:null};
  const R={events:{on(){},emit(){}},features:{register(){}}};
  const sandbox={window:{R},document,globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul'},Date,Intl,Math,Number,String,Array,Object,Map,Set,Promise,console,HTMLElement:class{}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(collection,sandbox,{filename:'app-collection-ui.js'});
  check('collection unlock timestamp near UTC midnight renders as Turkey date',R.collectionUI.unlockedDate('2026-09-14T21:30:00Z')==='15.09.2026');
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} quinary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
