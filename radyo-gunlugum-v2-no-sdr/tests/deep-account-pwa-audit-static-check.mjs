import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const auth=read('app-auth-service.js');
const authUI=read('app-auth-ui.js');
const ui=read('app-ui-state.js');
const user=read('app-user-services.js');
const listening=read('app-listening-service.js');
const sw=read('sw.js');
const pwaInstall=read('app-pwa-install.js');
const updates=read('app-pwa-updates.js');
const updatesCss=read('app-pwa-updates.css');
const calendar=read('app-calendar-ui.js');
const analysis=read('app-analysis-ui.js');
const language=read('app-language-service.js');

for(const [file,src] of [
  ['app-auth-service.js',auth],['app-auth-ui.js',authUI],['app-ui-state.js',ui],
  ['app-user-services.js',user],['app-listening-service.js',listening],
  ['app-pwa-install.js',pwaInstall],['app-pwa-updates.js',updates],
  ['app-calendar-ui.js',calendar],['app-analysis-ui.js',analysis],['app-language-service.js',language]
]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

check('auth change event carries previous user identity',auth.includes('previousUserId=currentId')&&auth.includes('previousUserId}'));
check('auth clears stale logs before a different account renders',auth.includes('if(changed){R.logs=[]'));
check('auth form coalesces double submit by UI lock',authUI.includes('if(submitting)return')&&authUI.includes('submit.disabled=submitting'));
check('auth submit captures mode before awaiting network',authUI.includes('actionMode=mode')&&authUI.includes("actionMode==='login'?await"));
check('auth tabs cannot switch mode mid-request',authUI.includes("$$('.auth-tab').forEach(b=>b.disabled=submitting)"));
check('logout button has a duplicate-action guard',authUI.includes('if(signingOut)return')&&authUI.includes('out.disabled=true'));

check('navigation/filter state is account-scoped',ui.includes("STATE_KEY='radio-ui-state-v40'")&&ui.includes('`${STATE_KEY}:${userId}`'));
check('legacy global UI state is retired',ui.includes("localStorage.removeItem(LEGACY_KEY)"));
check('account switch resets visible form without deleting stored draft',ui.includes('suppressDraftClear=true')&&ui.includes('function clearDraft(){if(suppressDraftClear)return false'));
check('prior account draft is explicitly saved before account restore',ui.includes('saveDraft(previousId);save(previousId)'));
check('draft saver accepts an explicit account identity',ui.includes('function saveDraft(userId=R.me?.id)'));
check('filters are cleared when absent in the next account state',ui.includes("el.value=state.filters[id]!==undefined?state.filters[id]:''"));
check('calendar can persist a date through UI state API',ui.includes('function setFilter(id,value)')&&calendar.includes("setFilter?.('filterDate',date)"));
check('calendar date math is timezone-stable UTC math',calendar.includes('Date.UTC(y,m-1,1)')&&calendar.includes('getUTCDay()'));
check('calendar days expose descriptive accessible labels',calendar.includes('aria-label="${label}"'));

check('user settings loads are keyed per account',user.includes('settingsFlights=new Map()')&&user.includes('settingsFlights.has(userId)'));
check('collection loads are keyed per account',user.includes('collectionsFlights=new Map()')&&user.includes('collectionsFlights.has(userId)'));
check('collection pagination pins user id for every page',user.includes("fetchUserRows(table,orderColumn,{ascending=false,userId=R.me?.id}={})")&&user.includes(".eq('user_id',userId)"));
check('stale user settings never overwrite the active account',user.includes('if(R.me?.id===userId){R.userSettings=value'));
check('reminder checks abort after an account transition',user.includes('if(R.me?.id!==userId)return;const now=new Date()'));

check('listening loads are keyed per account',listening.includes('loadFlights=new Map()')&&listening.includes('loadFlights.has(userId)'));
check('listening pagination pins account identity',listening.includes('fetchAttempts(limit=1500,userId=R.me?.id)')&&listening.includes('fetchCalibrations(limit=MAX_CALIBRATIONS,userId=R.me?.id)'));
check('listening state is cleared immediately on account change',listening.includes('if(x?.previousUserId&&x.previousUserId!==userId)clearState()'));
check('late listening responses are ignored after account switch',listening.includes('if(R.me?.id!==userId)return state;state.calibrations='));
check('same-tab listening session starts are coalesced',listening.includes('sessionStartFlights=new Map()')&&listening.includes('if(sessionStartFlights.has(userId))return sessionStartFlights.get(userId)'));
check('cross-tab active-session conflict reloads canonical session',listening.includes("q.error.code==='23505'")&&listening.includes('if(state.activeSession)return state.activeSession'));
check('unknown explicit listening session ids are rejected',listening.includes("throw new Error('Dinleme oturumu bulunamadı. Oturumu yeniden açıp tekrar dene.')"));

check('service worker only deletes its own app cache family',sw.includes("k.startsWith('radyo-')&&k!==CACHE")&&!sw.includes("if(k!==CACHE)await caches.delete(k)"));
check('service worker reads only from the active app cache',sw.includes('cached=await c.match(req)')&&!sw.includes('cached=await caches.match(req)'));
check('service worker ignores unknown same-origin GET assets',sw.includes('LOCAL_SET=new Set')&&sw.includes('if(sameOrigin&&!knownLocal)return'));
check('PWA install detects Safari standalone mode',pwaInstall.includes('navigator.standalone===true'));
check('PWA install recognizes touch iPadOS desktop UA',pwaInstall.includes("navigator.platform==='MacIntel'")&&pwaInstall.includes('navigator.maxTouchPoints'));
check('PWA install does not offer another install while standalone',pwaInstall.includes("if(isStandalone()){R.toast?.('Radyo Günlüğüm zaten uygulama olarak açık.')"));
check('PWA update reload blocks active recording',updates.includes("#recordStopBtn")&&updates.includes('!recording.disabled'));
check('PWA update reload protects not-yet-uploaded audio blob',updates.includes('R.recordedBlob&&!audioPath'));
check('PWA update checks are coalesced',updates.includes('if(checkFlight)return checkFlight'));
check('PWA update banner clears device safe area',updatesCss.includes('calc(86px + env(safe-area-inset-bottom))'));

check('analysis splits multi-value language fields',analysis.includes('const splitValues=')&&analysis.includes("count(logs,x=>splitValues(x.language))"));
check('analysis ignores invalid legacy hours',analysis.includes('!Number.isInteger(hour)||hour<0||hour>23'));
check('analysis counts normalized unique locations',analysis.includes("['Konum',uniqueCount(logs,x=>x.location)]"));
check('language service distinguishes ambiguous Arabic-script text safely',language.includes('Arapça ile Farsça güvenle ayrılamadı'));
check('language service distinguishes ambiguous Cyrillic text safely',language.includes('Kiril yazısı kullanılıyor; dil güvenle ayrılamadı'));
check('language service recognizes Greek script',language.includes("language:'Yunanca'"));

// Small functional checks for multi-language analytics.
{
  const R={features:{register(){}},router:{register(){}},events:{on(){}},logs:[]};
  const sandbox={window:{R},document:{querySelector(){return null}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  vm.createContext(sandbox);vm.runInContext(analysis,sandbox,{filename:'app-analysis-ui.js'});
  const values=R.analysisUI.splitValues('İngilizce / Fransızca, Almanca');
  check('analysis multi-language splitter works functionally',values.length===3&&values[1]==='Fransızca');
  const counted=R.analysisUI.count([{language:'İngilizce / Fransızca'},{language:'İngilizce'}],x=>R.analysisUI.splitValues(x.language));
  const map=new Map(counted);
  check('analysis multi-language counts each language independently',map.get('İngilizce')===2&&map.get('Fransızca')===1);
}

// Functional checks for script language detection.
{
  const R={features:{register(){}},events:{emit(){}}};
  const sandbox={window:{R},String,Array,Object,Math,Number,RegExp,console};
  vm.createContext(sandbox);vm.runInContext(language,sandbox,{filename:'app-language-service.js'});
  check('Greek text is identified as Greek',R.detect('Εδώ είναι οι ειδήσεις από το ραδιόφωνο').language==='Yunanca');
  check('Persian-specific script evidence identifies Persian',R.detect('این یک خبر برای رادیو است گ').language==='Farsça');
  check('Bulgarian lexical evidence identifies Bulgarian',R.detect('Това са новини от радио България').language==='Bulgarca');
  check('ambiguous Cyrillic does not default blindly to Russian',R.detect('АБВГД').language===null);
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} account/PWA/calendar audit checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
