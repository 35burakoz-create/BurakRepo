import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

const logForm=read('app-log-form-ui.js');
const uiState=read('app-ui-state.js');
const audio=read('app-audio-ui.js');
const offline=read('app-offline-service.js');
const pwa=read('app-pwa-updates.js');
const search=read('v44-search-rebuild.js');
const guide=read('app-guide-service.js');
const current=read('app-current-programs.js');

for(const [file,src] of [
  ['app-log-form-ui.js',logForm],['app-ui-state.js',uiState],['app-audio-ui.js',audio],
  ['app-offline-service.js',offline],['app-pwa-updates.js',pwa],['v44-search-rebuild.js',search],
  ['app-guide-service.js',guide],['app-current-programs.js',current]
]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

// Account/form transition protections.
check('GPS requests carry an invalidation generation',logForm.includes('geoGeneration')&&logForm.includes('request=++geoGeneration'));
check('GPS completion pins account edit target and route',logForm.includes('activeUserId()===userId')&&logForm.includes("($('#logId')?.value||'')===editId")&&logForm.includes("(R.router?.current?.()||'log')===route"));
check('form reset invalidates pending GPS work',logForm.includes('function reset(){geoGeneration++'));
check('record edit invalidates an older GPS request',logForm.includes('function edit(id){if(isSaving())return false;geoGeneration++'));
check('account handoff clears inherited draft dirty state',uiState.includes('finally{suppressDraftClear=false;draftDirty=false}'));

// Media permission and callback protections.
check('microphone permission requests are coalesced',audio.includes('captureFlight')&&audio.includes("if(captureFlight)return msg('Mikrofon açılıyor…')"));
check('microphone request pins account route and generation',audio.includes('token=++captureGeneration')&&audio.includes('R.me?.id===userId')&&audio.includes("(R.router?.current?.()||'audio')===route"));
check('stale microphone streams are stopped before recorder creation',audio.includes('if(!current()){stopMediaStream(s);return}')&&audio.indexOf('if(!current()){stopMediaStream(s);return}')<audio.indexOf('new MediaRecorder'));
check('old recorder callbacks stop their own stream only',audio.includes('if(stream===s){stream=null;stopMediaStream(s)')&&audio.includes('else stopMediaStream(s)'));
check('cleanup invalidates pending microphone and speech callbacks',audio.includes('function cleanup(){captureGeneration++;captureFlight=null;speechGeneration++'));
check('speech callbacks are account and generation scoped',audio.includes('token=++speechGeneration')&&audio.includes('speech===activeSpeech&&R.me?.id===userId'));

// Offline/PWA invariants kept in the focused audit.
check('offline writes keep stable idempotency identity',offline.includes('offline_queue_id:id')&&offline.includes("onConflict:'user_id,offline_queue_id'"));
check('offline sync is account keyed and abortable',offline.includes('syncFlights=new Map()')&&offline.includes("if(R.me?.id!==userId){interrupted=true;break}"));
check('PWA reload still protects unuploaded audio',pwa.includes('R.recordedBlob&&!audioPath'));
check('PWA activation still requires explicit user action',pwa.includes("waitingWorker.postMessage({type:'SKIP_WAITING'})")&&!pwa.includes("worker.postMessage({type:'SKIP_WAITING'})"));

// Search must remain balanced and linear for large stores.
check('global search dedupe is Set based',search.includes('function uniqueBy(')&&search.includes('const seen=new Set()')&&!search.includes('findIndex(y=>'));
check('numeric search appends with a Set instead of repeated some scans',search.includes('function appendFrequencyMatches(')&&!search.includes('!logMatches.some(')&&!search.includes('!guideMatches.some('));
check('indexed search has separate log and guide quotas',search.includes('function indexedMatches(')&&search.includes('logLimit=120,guideLimit=120'));

// Receiver and guide safety remains part of this focused sweep.
check('guide rejects receiver-unsupported bands',guide.includes('if(bands&&Object.keys(bands).length&&!range)return false'));
check('current guide loader has explicit pagination ceiling',current.includes('MAX_GUIDE_ROWS=50000')&&current.includes('veri sessizce kesilmedi'));

// Functional GPS race: a result requested by account A must not mutate account B.
{
  const elements={
    '#geoMsg':{textContent:''},'#location':{value:''},'#latitude':{value:''},'#longitude':{value:''},'#logId':{value:''}
  };
  let success,errorCb;
  const R={
    me:{id:'u1'},B:[],logs:[],num:Number,
    listeningOrigin:()=>({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}),
    clock:{local:()=>({date:'2026-09-14',time:'10:00'})},
    router:{current:()=> 'log',register(){}},events:{on(){},emit(){}},features:{register(){}}
  };
  const document={
    querySelector:s=>elements[s]||null,
    createElement:()=>({dataset:{},classList:{add(){},remove(){}},appendChild(){},querySelector(){return null}}),
    head:{appendChild(){}},getElementById(){return null}
  };
  const navigator={geolocation:{getCurrentPosition(ok,fail){success=ok;errorCb=fail}}};
  const sandbox={window:{R,scrollTo(){}},globalThis:null,document,navigator,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}};
  vm.createContext(sandbox);vm.runInContext(logForm,sandbox,{filename:'app-log-form-ui.js'});
  const beforeLat=elements['#latitude'].value,beforeLon=elements['#longitude'].value;
  R.logFormUI.geo();
  R.me={id:'u2'};
  success({coords:{latitude:40.1,longitude:29.2,accuracy:12}});
  check('stale GPS success cannot write into the next account',elements['#latitude'].value===beforeLat&&elements['#longitude'].value===beforeLon);
  R.me={id:'u1'};
  R.logFormUI.geo();
  success({coords:{latitude:38.2,longitude:27.4,accuracy:8}});
  check('current GPS success still updates coordinates',elements['#latitude'].value==='38.200000'&&elements['#longitude'].value==='27.400000');
  R.logFormUI.geo();
  R.reset();
  success({coords:{latitude:39.9,longitude:28.8,accuracy:5}});
  check('form reset invalidates an older GPS callback',elements['#latitude'].value==='38.151000'&&elements['#longitude'].value==='27.360000');
  check('GPS test installed an error callback',typeof errorCb==='function');
}

// Functional microphone race: leaving the route before permission resolves must stop the stale stream.
{
  const elements={
    '#audioMsg':{textContent:''},
    '#recordStartBtn':{disabled:false,dataset:{}},'#recordStopBtn':{disabled:true,dataset:{}},
    '#speechStartBtn':{disabled:false,dataset:{}},'#speechStopBtn':{disabled:true,dataset:{}},
    '#speechText':{value:''}
  };
  let route='audio',resolveMedia,getUserMediaCalls=0,recorderConstructs=0,staleStops=0;
  const mediaDevices={getUserMedia(){getUserMediaCalls++;return new Promise(resolve=>{resolveMedia=resolve})}};
  class FakeMediaRecorder{
    static isTypeSupported(){return false}
    constructor(stream){this.stream=stream;this.state='inactive';this.mimeType='audio/webm';recorderConstructs++}
    start(){this.state='recording'}
    stop(){this.state='inactive';this.onstop?.()}
  }
  class FakeSpeechRecognition{constructor(){FakeSpeechRecognition.last=this}start(){}stop(){}}
  const R={
    me:{id:'u1'},recordedBlob:null,
    router:{current:()=>route,register(){}},events:{on(){},emit(){}},features:{register(){}},reportError(){},
    S:{storage:{from(){return{upload:async()=>({error:null})}}}}
  };
  const sandbox={
    window:{R,addEventListener(){},SpeechRecognition:FakeSpeechRecognition},document:{querySelector:s=>elements[s]||null},navigator:{mediaDevices},
    MediaRecorder:FakeMediaRecorder,URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Blob,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,
    setTimeout(){return 0},setInterval(){return 0},clearInterval(){}
  };
  vm.createContext(sandbox);vm.runInContext(audio,sandbox,{filename:'app-audio-ui.js'});
  const first=R.audioUI.startRecording();
  R.audioUI.startRecording();
  check('duplicate pending microphone start makes one permission request',getUserMediaCalls===1);
  R.audioUI.cleanup();route='home';
  const staleStream={getTracks:()=>[{stop(){staleStops++}}]};
  resolveMedia(staleStream);await first;
  check('stale microphone stream is closed',staleStops===1);
  check('stale permission completion creates no recorder',recorderConstructs===0);

  route='audio';R.me={id:'u1'};
  let liveStops=0;mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop(){liveStops++}}]});
  await R.audioUI.startRecording();
  check('current microphone permission still starts recording',recorderConstructs===1&&elements['#recordStartBtn'].disabled===true&&elements['#recordStopBtn'].disabled===false);
  R.audioUI.cleanup();
  check('active microphone stream is closed during cleanup',liveStops>=1);

  R.me={id:'u1'};route='audio';elements['#speechText'].value='';
  R.audioUI.startSpeech();const oldSpeech=FakeSpeechRecognition.last;
  R.me={id:'u2'};
  const result=[{transcript:'eski hesap metni'}];result.isFinal=true;
  oldSpeech.onresult?.({resultIndex:0,results:[result]});
  check('stale speech callback cannot write into another account',elements['#speechText'].value==='');
}

// Functional search: many matching logs must not starve guide results.
{
  const logs=Array.from({length:180},(_,i)=>({id:`l${i}`,station:`Radio Test ${i}`,country:'Türkiye',language:'Türkçe',band:'SW9',frequency:17650,date:'2026-09-14',time:'10:00'}));
  const guideRow={id:'g1',entry_type:'station_target',station:'Radio Test Guide',country:'ROU',language_content:'Romence',mode:'SW',band:'SW9',frequency:17650,time_text:'10:00–11:00'};
  const docs=[...logs.map(x=>({kind:'log',id:x.id,text:'radio test 17650',raw:x})),{kind:'guide',id:'g1',text:'radio test guide 17650',raw:guideRow}];
  const R={
    me:{id:'u1'},logs,guideEntries:[guideRow],norm:v=>String(v??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,''),
    store:{index:{docs,stations:new Map(),countries:new Map(),frequencies:new Map()}},router:{go(){}},edit(){},renderGuide(){}
  };
  const document={querySelector(){return null},createElement(){return{dataset:{},addEventListener(){},append(){},setAttribute(){},classList:{add(){},remove(){}}}},head:{appendChild(){}},addEventListener(){},documentElement:{classList:{add(){},remove(){}}}};
  const sandbox={window:{R,addEventListener(){}},document,Element:class{},HTMLElement:class{},Event:class{},Map,Set,Date,Math,Number,String,Array,Object,Promise,console,setTimeout(){return 0},clearTimeout(){}};
  vm.createContext(sandbox);vm.runInContext(search,sandbox,{filename:'v44-search-rebuild.js'});
  const textResult=R.v44SearchEngine('radio test');
  check('large log result set does not starve guide group',textResult.groups.some(g=>g.title==='Kayıtlar')&&textResult.groups.some(g=>g.title==='Yayın Rehberi'));
  const numericResult=R.v44SearchEngine('17.65');
  const logGroup=numericResult.groups.find(g=>g.title==='Kayıtlar'),guideGroup=numericResult.groups.find(g=>g.title==='Yayın Rehberi');
  check('numeric MHz-style query finds kHz log frequency',!!logGroup?.items?.length);
  check('numeric MHz-style query also finds guide frequency',!!guideGroup?.items?.length);
  check('search source no longer contains quadratic id dedupe',!search.includes('findIndex(y=>')&&!search.includes('!logMatches.some('));
}

// Functional receiver edges and overnight schedule boundary.
{
  const R={
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),events:{on(){},emit(){}},features:{register(){}},
    clock:{today:()=> '2026-09-14',time:()=> '03:59',parts:()=>({date:'2026-09-14',hour:3,minute:59})},
    logs:[],bandProfiles:[],guideEntries:[],listeningOrigin:()=>({name:'Bozköy',lat:38.151,lon:27.36})
  };
  const config={timezone:'Europe/Istanbul',origin:{name:'Bozköy',lat:38.151,lon:27.36},receiver:{bands:{FM:{min:76,max:108},MW:{min:525,max:1610},SW9:{min:17550,max:17900}}}};
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:config,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(guide,sandbox,{filename:'app-guide-service.js'});
  check('receiver lower boundary is accepted',R.guideService.receiverCompatible({mode:'SW',band:'SW9',frequency:17550})===true);
  check('receiver upper boundary is accepted',R.guideService.receiverCompatible({mode:'SW',band:'SW9',frequency:17900})===true);
  check('frequency just outside receiver boundary is rejected',R.guideService.receiverCompatible({mode:'SW',band:'SW9',frequency:17900.1})===false);
  const overnight={mode:'SW',band:'SW9',frequency:17650,raw:{schedule:{start_minute:1200,end_minute:60,days_iso:'7',all_day:false,target:'Eu',source_timezone:'UTC'}}};
  check('overnight broadcast remains active one minute before end',R.guideService.activeAt(overnight,'2026-09-14','03:59')===true);
  check('overnight broadcast end minute is exclusive',R.guideService.activeAt(overnight,'2026-09-14','04:00')===false);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} selected-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
