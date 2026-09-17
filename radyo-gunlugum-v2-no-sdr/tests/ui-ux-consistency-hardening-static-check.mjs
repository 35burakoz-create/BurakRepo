import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const scope=read('app-user-log-scope.js');
const ux=read('app-ui-ux-consistency.js');
const uxCss=read('app-ui-ux-consistency.css');

new Function(scope);
new Function(ux);
check('owned log scope boots between foundation and runtime',bootstrap.indexOf("'app-foundation.js'")<bootstrap.indexOf("'app-user-log-scope.js'")&&bootstrap.indexOf("'app-user-log-scope.js'")<bootstrap.indexOf("'app-runtime-core.js'"));
check('owned log scope is a critical bootstrap module',bootstrap.includes("CRITICAL=new Set(['app-foundation.js','app-user-log-scope.js'"));
check('owned log scope is cached as a critical PWA module',sw.includes("const OWNED_LOG_SCOPE='20260917-13'")&&sw.includes("'./app-user-log-scope.js'")&&sw.includes("'./app-foundation.js','./app-user-log-scope.js','./app-runtime-core.js'"));
check('scope exposes canonical owned-row helpers',scope.includes('R.isOwnedRow=isOwnedRow')&&scope.includes('R.ownedLogs=')&&scope.includes('R.rawLogs='));
check('scope fails closed without an authenticated user',scope.includes('if(!userId)return false')&&scope.includes('if(!userId)return[]'));

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
check('active account sees its rows plus ownerless legacy rows',JSON.stringify(R.logs.map(x=>x.id))==='[1,3,4]');
R.me={id:'u2'};
check('switching account immediately hides the previous account rows',JSON.stringify(R.logs.map(x=>x.id))==='[2,3,4]');
R.me=null;
check('signed-out state exposes no retained log rows',R.logs.length===0);
R.me={id:'u1'};
R.logs=[{id:5,user_id:'u2'},{id:6,user_id:'u1'}];
check('new runtime assignments are filtered through the same contract',JSON.stringify(R.logs.map(x=>x.id))==='[6]'&&R.rawLogs().length===2);
check('legacy rows can be explicitly excluded by callers',R.ownedLogs([{id:7},{id:8,user_id:'u1'}],'u1',{legacy:false}).map(x=>x.id).join(',')==='8');

check('UI UX consistency layer boots after audit polish',bootstrap.indexOf("'app-ui-audit-polish.js'")<bootstrap.indexOf("'app-ui-ux-consistency.js'"));
check('UI UX consistency assets are in the PWA cache',sw.includes("const UI_UX_CONSISTENCY='20260917-14'")&&sw.includes("'./app-ui-ux-consistency.css'")&&sw.includes("'./app-ui-ux-consistency.js'"));
check('location-name changes with retained coordinates become unresolved',ux.includes('locationState.dirty=hasCoords&&x.label!==locationState.label'));
check('unresolved location-coordinate mismatch blocks form submission',ux.includes("form.addEventListener('submit'")&&ux.includes('event.preventDefault()')&&ux.includes('event.stopImmediatePropagation()'));
check('location guard offers clear GPS refresh and explicit confirmation choices',ux.includes('data-location-clear-coords')&&ux.includes('data-location-refresh-gps')&&ux.includes('data-location-confirm-coords'));
check('GPS success resolves the location-coordinate warning',ux.includes('MutationObserver')&&ux.includes('/Koordinatlar alındı/i.test')&&ux.includes('snapshotLocation()'));
check('coordinate confirmation validates latitude and longitude ranges',ux.includes('a>=-90&&a<=90')&&ux.includes('b>=-180&&b<=180'));
check('location mismatch warning is mobile-friendly and uses canonical touch size',uxCss.includes('app-location-coordinate-guard')&&uxCss.includes('var(--app-touch-min,44px)')&&uxCss.includes('@media(max-width:560px)'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} UI/UX consistency hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
