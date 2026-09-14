import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const logUI=read('app-log-ui.js');
const quick=read('app-quick-log.js');
const auth=read('app-auth-service.js');
const authUI=read('app-auth-ui.js');
const updates=read('app-pwa-updates.js');
const sw=read('sw.js');

for(const [file,src] of [['app-log-ui.js',logUI],['app-quick-log.js',quick],['app-auth-service.js',auth],['app-auth-ui.js',authUI],['app-pwa-updates.js',updates],['sw.js',sw]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

check('journal summaries isolate the active account',logUI.includes('function ownedLogs()')&&logUI.includes("x.user_id===userId"));
check('journal signal summaries accept only the personal 1-5 scale',logUI.includes('Number.isInteger(n)&&n>=1&&n<=5'));
check('journal location summary validates latitude and longitude ranges',logUI.includes('lat>=-90&&lat<=90')&&logUI.includes('lon>=-180&&lon<=180'));
check('journal transcript handling tolerates non-string legacy values',logUI.includes("typeof v==='string'?v.trim():''"));
check('journal smart-confidence display rejects impossible percentages',logUI.includes('n>=0&&n<=100?Math.round(n):null'));
check('journal filter search uses sanitized transcript text',logUI.includes('transcriptText(x.transcript)'));
check('journal account transition resets delayed search state',logUI.includes('clearTimeout(searchTimer);searchTimer=null'));

check('quick log validates listening-origin coordinate ranges',quick.includes('function validCoords(lat,lon)')&&quick.includes('lat>=-90&&lat<=90'));
check('quick log falls back to configured Bozkoy origin on corrupt coordinates',quick.includes('validCoords(o.lat,o.lon)?')&&quick.includes("C.origin?.name||'Bozköy, Torbalı, İzmir'"));
check('quick log distinguishes persisted writes from refresh state',quick.includes('persisted=false')&&quick.includes('persisted=true'));
check('quick log never re-enables save after persistence succeeded',quick.includes('if(saving||persisted)return')&&quick.indexOf('persisted=true')<quick.indexOf("R.reportError?.(error,'quick-log-refresh'"));
check('quick log reports refresh failure separately from save failure',quick.includes("'quick-log-refresh'")&&quick.includes("'quick-log-save'"));
check('quick log bounds free-form station and note input sizes',quick.includes('maxlength="180"')&&quick.includes('maxlength="500"'));

check('auth service has a non-fatal post-auth data loader',auth.includes('async function loadFor(userId,source)')&&auth.includes("events?.emit?.('auth:data-error'"));
check('sign in returns authentication data even if later data load fails',auth.includes("await loadFor(user.id,'sign-in');return q.data"));
check('authenticated signup uses the same non-fatal loader',auth.includes("await loadFor(q.data.user.id,'sign-up')"));
check('boot keeps a valid session even when app data refresh fails',auth.includes("await loadFor(user.id,'boot');return user"));
check('auth UI invalidates stale submit completions',authUI.includes('submitGeneration')&&authUI.includes('generation!==submitGeneration'));
check('auth UI clears password on authentication transitions',authUI.includes('function clearSensitive')&&authUI.includes("password.value=''"));
check('auth UI surfaces data refresh failure separately from credential errors',authUI.includes("R.events?.on?.('auth:data-error'"));

check('PWA updater rejects redundant waiting workers',updates.includes("waitingWorker?.state==='redundant'")&&updates.includes('function usableWaiting()'));
check('PWA controller transition rechecks audio-loss blockers',updates.includes("if(refreshing){const reason=reloadBlockedReason()")&&updates.includes('activationPendingReload=true'));
check('PWA update stop clears visible banner and activation state',updates.includes('refreshing=false;close()'));
check('service worker navigation caches only successful network shells',sw.includes("if(r&&r.ok){await c.put('./index.html',r.clone());return r}"));
check('service worker navigation falls back to cached shell on HTTP failure',sw.includes('return cached||r||Response.error()'));
check('service worker navigation falls back to cached shell on network rejection',sw.includes('catch{return cached||Response.error()}'));

// Functional journal legacy-data checks.
{
  const elements=new Map();
  const document={querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],addEventListener(){},createElement(){return{dataset:{},appendChild(){},setAttribute(){}}}};
  const R={me:{id:'u1'},logs:[
    {id:'1',user_id:'u1',station:'A',signal_strength:5,latitude:38,longitude:27,transcript:'  hello  ',smart_confidence:88},
    {id:'2',user_id:'u2',station:'FOREIGN',signal_strength:5,latitude:38,longitude:27,transcript:'hidden'},
    {id:'3',station:'Legacy',signal_strength:99,latitude:91,longitude:181,transcript:42,smart_confidence:999}
  ],features:{register(){}},events:{on(){}},B:[],router:{current:()=>''},norm:v=>String(v??'').toLowerCase(),freq:()=>''};
  const sandbox={window:{R,open(){return null}},document,R,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0},clearTimeout(){},confirm(){return false},CSS:{escape:String},Element:class{}};
  vm.createContext(sandbox);vm.runInContext(logUI,sandbox,{filename:'app-log-ui.js'});
  check('functional journal ownership keeps ownerless legacy but removes foreign row',R.logUI.ownedLogs().length===2&&!R.logUI.ownedLogs().some(x=>x.station==='FOREIGN'));
  check('functional journal signal helper rejects corrupt 99/5',R.logUI.signalValue(5)===5&&R.logUI.signalValue(99)===null);
  check('functional journal coordinates accept valid Turkey point',R.logUI.validCoords({latitude:38.151,longitude:27.36})===true);
  check('functional journal coordinates reject overflow',R.logUI.validCoords({latitude:91,longitude:181})===false);
  check('functional journal transcript sanitizer rejects non-string legacy payload',R.logUI.transcriptText(42)===''&&R.logUI.transcriptText(' x ')==='x');
  check('functional journal confidence helper rejects impossible values',R.logUI.confidenceValue(88)===88&&R.logUI.confidenceValue(999)===null);
}

// Functional quick-log origin fallback checks.
{
  const R={me:{id:'u1'},listeningOrigin:()=>({name:'Bozuk',lat:999,lon:999}),features:{register(){}},events:{on(){}}};
  const document={querySelector(){return null},addEventListener(){}};
  const sandbox={window:{R},document,R,navigator:{onLine:true},RADIO_APP_CONFIG:{origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}},Date,Math,Number,String,Array,Object,Promise,console};
  vm.createContext(sandbox);vm.runInContext(quick,sandbox,{filename:'app-quick-log.js'});
  const o=R.quickLog.origin();
  check('functional quick-log rejects impossible coordinates',R.quickLog.validCoords(91,27)===false&&R.quickLog.validCoords(38,181)===false);
  check('functional quick-log corrupt origin falls back to Bozkoy',o.name==='Bozköy, Torbalı, İzmir'&&o.lat===38.151&&o.lon===27.36);
}

// Authentication must remain successful even when the first data refresh fails.
{
  const emitted=[];
  let authChangeCallback=null;
  const R={
    me:null,logs:[],schedules:[],store:{sync(){}},features:{register(){}},
    events:{emit:(name,payload)=>emitted.push([name,payload])},
    load:async()=>{throw new Error('refresh failed')},
    S:{auth:{
      signInWithPassword:async()=>({data:{user:{id:'u1',email:'a@b.test'},session:{token:'x'}},error:null}),
      signUp:async()=>({data:{user:{id:'u1'},session:{token:'x'}},error:null}),
      signOut:async()=>({error:null}),getSession:async()=>({data:{session:null},error:null}),
      onAuthStateChange:fn=>{authChangeCallback=fn}
    }}
  };
  const sandbox={window:{R},R,Promise,queueMicrotask,console};
  vm.createContext(sandbox);vm.runInContext(auth,sandbox,{filename:'app-auth-service.js'});
  let data=null,error=null;try{data=await R.auth.signIn('a@b.test','password')}catch(e){error=e}
  check('functional auth sign-in survives post-login data refresh failure',!error&&data?.user?.id==='u1'&&R.me?.id==='u1');
  check('functional auth emits a dedicated data error after successful login',emitted.some(([name,p])=>name==='auth:data-error'&&p?.userId==='u1'));
  check('auth state listener remains installed after hardening',typeof authChangeCallback==='function');
}

// Functional auth UI sensitive-state cleanup.
{
  const nodes={
    '#authPassword':{value:'secret',autocomplete:'',classList:{toggle(){}},setAttribute(){}},
    '#authMsg':{textContent:'old error',classList:{toggle(){}},setAttribute(){}},
    '#authView':{classList:{toggle(){}}},'#appView':{classList:{toggle(){}}},'#userBox':{classList:{toggle(){}}},
    '#userEmail':{textContent:'',classList:{toggle(){}}},'#authSubmit':{textContent:'',disabled:false,setAttribute(){}},'#logoutBtn':null,'#authForm':null
  };
  const handlers={};
  const document={querySelector:s=>nodes[s]??null,querySelectorAll:()=>[],addEventListener(){}};
  const R={me:null,features:{register(){}},events:{on:(name,fn)=>{handlers[name]=fn}}};
  const sandbox={window:{R},document,R,String,Array,Object,Promise,console};
  vm.createContext(sandbox);vm.runInContext(authUI,sandbox,{filename:'app-auth-ui.js'});
  nodes['#authPassword'].value='secret';nodes['#authMsg'].textContent='old error';handlers['auth:changed']?.({user:{id:'u1',email:'a@b.test'},authenticated:true});
  check('functional auth transition clears password immediately',nodes['#authPassword'].value==='');
  check('functional auth transition clears stale credential message',nodes['#authMsg'].textContent==='');
}

// Functional service-worker navigation: 503 should use the cached application shell.
{
  const listeners={};
  const cached={tag:'cached-shell',ok:true,clone(){return this}};
  let putCount=0;
  const cache={match:async key=>key==='./index.html'?cached:null,put:async()=>{putCount++}};
  const self={location:{href:'https://radio.test/sw.js',origin:'https://radio.test'},addEventListener:(name,fn)=>{listeners[name]=fn},clients:{claim:async()=>{}},skipWaiting(){}};
  const sandbox={self,importScripts(){},RADIO_APP_CONFIG:{cacheVersion:'test'},caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},fetch:async()=>({ok:false,status:503,clone(){return this}}),URL,Set,Promise,Error,Response:{error:()=>({tag:'error'})},console};
  vm.createContext(sandbox);vm.runInContext(sw,sandbox,{filename:'sw.js'});
  let responsePromise=null;
  listeners.fetch({request:{method:'GET',url:'https://radio.test/app',mode:'navigate'},respondWith:p=>{responsePromise=p}});
  const response=await responsePromise;
  check('functional service worker serves cached shell for 503 navigation',response===cached);
  check('functional service worker does not cache failed navigation response',putCount===0);
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} nonary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
