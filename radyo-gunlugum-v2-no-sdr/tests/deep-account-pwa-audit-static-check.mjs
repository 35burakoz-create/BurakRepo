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
const updates=read('app-pwa-updates.js');
const updatesCss=read('app-pwa-updates.css');
const calendar=read('app-calendar-ui.js');
const analysis=read('app-analysis-ui.js');

for(const [file,src] of [
  ['app-auth-service.js',auth],['app-auth-ui.js',authUI],['app-ui-state.js',ui],
  ['app-user-services.js',user],['app-listening-service.js',listening],
  ['app-pwa-updates.js',updates],['app-calendar-ui.js',calendar],['app-analysis-ui.js',analysis]
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
check('account switch resets visible form without deleting new draft',ui.includes('suppressDraftClear=true')&&ui.includes('if(!suppressDraftClear)clearDraft()'));
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

check('service worker only deletes its own app cache family',sw.includes("k.startsWith('radyo-')&&k!==CACHE")&&!sw.includes("if(k!==CACHE)await caches.delete(k)"));
check('service worker reads only from the active app cache',sw.includes('cached=await c.match(req)')&&!sw.includes('cached=await caches.match(req)'));
check('service worker ignores unknown same-origin GET assets',sw.includes('LOCAL_SET=new Set')&&sw.includes('if(sameOrigin&&!knownLocal)return'));
check('PWA update reload blocks active recording',updates.includes("#recordStopBtn")&&updates.includes('!recording.disabled'));
check('PWA update reload protects not-yet-uploaded audio blob',updates.includes('R.recordedBlob&&!audioPath'));
check('PWA update checks are coalesced',updates.includes('if(checkFlight)return checkFlight'));
check('PWA update banner clears device safe area',updatesCss.includes('calc(86px + env(safe-area-inset-bottom))'));

check('analysis splits multi-value language fields',analysis.includes('const splitValues=')&&analysis.includes("count(logs,x=>splitValues(x.language))"));
check('analysis ignores invalid legacy hours',analysis.includes('!Number.isInteger(hour)||hour<0||hour>23'));
check('analysis counts normalized unique locations',analysis.includes("['Konum',uniqueCount(logs,x=>x.location)]"));

// Small functional check for multi-language analytics.
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

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} account/PWA/calendar audit checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
