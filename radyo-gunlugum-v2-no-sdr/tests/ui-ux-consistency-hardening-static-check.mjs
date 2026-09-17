import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const config=read('app-config.js');
const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const scope=read('app-user-log-scope.js');
const analysis=read('app-analysis-ui.js');
const calendar=read('app-calendar-ui.js');
const ux=read('app-ui-ux-consistency.js');
const uxCss=read('app-ui-ux-consistency.css');

new Function(scope);
new Function(ux);
check('PWA config has a unique build generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-52'")&&config.includes("buildId:'20260917-19'")&&config.includes('dataset.appBuild=config.buildId'));
check('service worker cache name consumes the central build generation',sw.includes("const BUILD_ID=String(CFG.buildId||'legacy')")&&sw.includes('const CACHE=`radyo-${CFG.cacheVersion}-${BUILD_ID}`')&&sw.includes("const PWA_CACHE_GENERATION='20260917-19'"));
check('owned log scope boots between foundation and runtime',bootstrap.indexOf("'app-foundation.js'")<bootstrap.indexOf("'app-user-log-scope.js'")&&bootstrap.indexOf("'app-user-log-scope.js'")<bootstrap.indexOf("'app-runtime-core.js'"));
check('owned log scope is a critical bootstrap module',bootstrap.includes("CRITICAL=new Set(['app-foundation.js','app-user-log-scope.js'"));
check('owned log scope is cached as a critical PWA module',sw.includes("const OWNED_LOG_SCOPE='20260917-13'")&&sw.includes("'./app-user-log-scope.js'")&&sw.includes("'./app-foundation.js','./app-user-log-scope.js','./app-runtime-core.js'"));
check('scope exposes canonical owned-row helpers',scope.includes('R.isOwnedRow=isOwnedRow')&&scope.includes('R.ownedLogs=')&&scope.includes('R.rawLogs=')&&scope.includes('R.invalidateOwnedLogs=invalidate'));
check('scope fails closed without an authenticated user',scope.includes('if(!userId)return false')&&scope.includes('if(!userId)return[]'));
check('scope memoizes the current raw-list and account view',scope.includes('cache.rows===source&&cache.userId===userId&&cache.legacy===legacy')&&scope.includes('cache={rows:source,userId,legacy,value}'));
check('analysis consumes canonical owned logs',analysis.includes("typeof R.ownedLogs==='function'?R.ownedLogs():R.logs||[]")&&!analysis.includes('x?.user_id===userId'));
check('calendar consumes canonical owned logs',calendar.includes("typeof R.ownedLogs==='function'?R.ownedLogs():R.logs||[]")&&!calendar.includes('if(x?.user_id!==userId)continue'));

const listeners=new Map();
const R={
  me:{id:'u1'},
  logs:[
    {id:1,user_id:'u1'},
    {id:2,user_id:'u2'},
    {id:3,user_id:null},
    {id:4}
  ],
  events:{on(name,fn){listeners.set(name,fn)}},
  store:{sync(){}},
  features:{register(){}},
  reportError(){throw new Error('scope install should not fail')}
};
const context={window:{R}};
vm.createContext(context);
vm.runInContext(scope,context);
const u1a=R.logs,u1b=R.logs;
check('active account sees its rows plus ownerless legacy rows',JSON.stringify(u1a.map(x=>x.id))==='[1,3,4]');
check('repeated reads reuse the same memoized owned array',u1a===u1b);
R.me={id:'u2'};
const u2=R.logs;
check('switching account immediately hides the previous account rows',JSON.stringify(u2.map(x=>x.id))==='[2,3,4]'&&u2!==u1a);
R.me=null;
check('signed-out state exposes no retained log rows',R.logs.length===0);
R.me={id:'u1'};
R.logs=[{id:5,user_id:'u2'},{id:6,user_id:'u1'}];
const assignedA=R.logs,assignedB=R.logs;
check('new runtime assignments are filtered through the same contract',JSON.stringify(assignedA.map(x=>x.id))==='[6]'&&R.rawLogs().length===2);
check('runtime assignment invalidates then rememoizes the owned view',assignedA===assignedB&&assignedA!==u1a);
check('legacy rows can be explicitly excluded by callers',R.ownedLogs([{id:7},{id:8,user_id:'u1'}],'u1',{legacy:false}).map(x=>x.id).join(',')==='8');

check('UI UX consistency layer boots after audit polish',bootstrap.indexOf("'app-ui-audit-polish.js'")<bootstrap.indexOf("'app-ui-ux-consistency.js'"));
check('UI UX consistency assets are in the PWA cache',sw.includes("const UI_UX_CONSISTENCY='20260917-14'")&&sw.includes("'./app-ui-ux-consistency.css'")&&sw.includes("'./app-ui-ux-consistency.js'"));
check('location-name changes with retained coordinates become unresolved',ux.includes('locationState.dirty=hasCoords&&x.label!==locationState.label'));
check('unresolved location-coordinate mismatch blocks form submission',ux.includes("form.addEventListener('submit'")&&ux.includes('event.preventDefault()')&&ux.includes('event.stopImmediatePropagation()'));
check('location guard offers clear GPS refresh and explicit confirmation choices',ux.includes('data-location-clear-coords')&&ux.includes('data-location-refresh-gps')&&ux.includes('data-location-confirm-coords'));
check('GPS success resolves the location-coordinate warning',ux.includes('MutationObserver')&&ux.includes('/Koordinatlar alındı/i.test')&&ux.includes('snapshotLocation()'));
check('coordinate confirmation validates latitude and longitude ranges',ux.includes('a>=-90&&a<=90')&&ux.includes('b>=-180&&b<=180'));
check('location mismatch warning is mobile-friendly and uses canonical touch size',uxCss.includes('app-location-coordinate-guard')&&uxCss.includes('var(--app-touch-min,44px)')&&uxCss.includes('@media(max-width:560px)'));

check('Now candidate cards are converted from implicit buttons into informational articles',ux.includes("root.querySelectorAll('button.radio-candidate-card')")&&ux.includes("document.createElement('article')")&&ux.includes('app-now-candidate-static'));
check('Now candidate actions are explicit and consistent',ux.includes("nowButton('Dinle'")&&ux.includes("nowButton('Detay'")&&ux.includes("nowButton('Kayıt formuna aktar'"));
check('MW candidates reuse guide matches for listen and prefill actions',ux.includes('R.radioConsole?.guideMatch?.(row)')&&ux.includes('guide?.id'));
check('Now card normalization survives rerenders',ux.includes('new MutationObserver(scheduleNowNormalization)')&&ux.includes("'radio-console:mw-ready'")&&ux.includes("'render:all'"));
check('explicit Now actions keep canonical touch targets on mobile',uxCss.includes('.app-now-card-actions .btn')&&uxCss.includes('min-height:var(--app-touch-min,44px)'));

check('station detail gets primary listen and prefill actions from its guide match',ux.includes('function decorateStationDetail')&&ux.includes("nowButton('Dinlemeye başla'")&&ux.includes("nowButton('Kayıt formuna aktar'"));
check('station detail action footer resolves the current schedule row safely',ux.includes('function stationDetailRow')&&ux.includes("root?.dataset?.detailSource||'current'")&&ux.includes('R.radioConsole?.guideMatch?.(row)'));
check('station detail action footer survives detail rerenders',ux.includes('function watchStationDetail')&&ux.includes("stationDetailObserver.observe(document.body,{childList:true,subtree:true})"));
check('station detail fallback explains unavailable direct actions',ux.includes('Bu istasyon henüz doğrudan bir yayın rehberi kaydına bağlanamadı.'));
check('station detail actions are sticky and maintain touch targets',uxCss.includes('.app-station-detail-actions{position:sticky')&&uxCss.includes('.app-station-detail-actions .btn')&&uxCss.includes('var(--app-touch-min,44px)'));

check('live and session signal controls are visually blanked on first render',ux.includes('function decorateSignalGroup')&&ux.includes("b.classList.remove('active')")&&ux.includes("group.dataset.uxSignalChosen=''"));
check('signal buttons explicitly record user choice',ux.includes('function handleSignalCapture')&&ux.includes('group.dataset.uxSignalChosen=signalButton.dataset.appSignal||signalButton.dataset.sessionSignal'));
check('heard and weak results are blocked until a signal is chosen',ux.includes("result.dataset.appResult==='none'")&&ux.includes('event.stopImmediatePropagation()')&&ux.includes('Duyulan bir sonuç için önce sinyal gücünü seç.'));
check('no-heard result remains allowed without a signal score',ux.includes("result.dataset.appResult==='none'||result.dataset.sessionResult==='none'"));
check('listening service has a defense-in-depth signal guard',ux.includes('function guardListeningService')&&ux.includes("result!=='none'&&!group.dataset.uxSignalChosen")&&ux.includes('Promise.reject(new Error'));
check('signal guard runs in window capture before document handlers',ux.includes("window.addEventListener('click',handleSignalCapture,true)"));
check('signal guidance is readable and error state is visible',uxCss.includes('.app-listen-signal-hint')&&uxCss.includes('#appListenState.error,#appSessionState.error'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} UI/UX consistency hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
