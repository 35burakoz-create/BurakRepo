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

new Function(scope);
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

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} UI/UX consistency hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
