import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const foundation=read('app-foundation.js');
const sw=read('sw.js');
const updates=read('app-pwa-updates.js');
const smoke=read('app-smoke.js');
const intelligence=read('app-radio-intelligence.js');

for(const [file,src] of [['app-foundation.js',foundation],['sw.js',sw],['app-pwa-updates.js',updates],['app-smoke.js',smoke],['app-radio-intelligence.js',intelligence]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

const installStart=sw.indexOf("self.addEventListener('install'");
const messageStart=sw.indexOf("self.addEventListener('message'");
const installBlock=installStart>=0&&messageStart>installStart?sw.slice(installStart,messageStart):'';
check('service worker no longer activates an update before user approval',!!installBlock&&!installBlock.includes('skipWaiting'));
check('service worker accepts an explicit SKIP_WAITING command',sw.includes("event.data?.type==='SKIP_WAITING'")&&sw.includes('self.skipWaiting()'));
check('PWA updater watches an already waiting worker',updates.includes('if(reg.waiting)')&&updates.includes('waitingWorker=reg.waiting'));
check('PWA updater watches updatefound/installing lifecycle',updates.includes("addEventListener('updatefound'")&&updates.includes("worker.state==='installed'"));
check('PWA updater asks waiting worker to activate only after user action',updates.includes("waitingWorker.postMessage({type:'SKIP_WAITING'})"));
check('PWA updater reloads after controller transition',updates.includes("addEventListener('controllerchange'")&&updates.includes('if(refreshing){location.reload();return}'));
check('PWA updater keeps audio-loss guards',updates.includes('R.recordedBlob&&!audioPath')&&updates.includes('#recordStopBtn'));
check('PWA update checks remain coalesced',updates.includes('if(checkFlight)return checkFlight'));

check('smoke test no longer hardcodes A26 row threshold',!smoke.includes('a26>=5000')&&!smoke.includes("season==='A26').length;add('A26"));
check('smoke test validates the active calculated broadcast season',smoke.includes("add('Aktif yayın sezonu'")&&smoke.includes('R.radioIntelligence.seasonStatus()'));
check('smoke test covers radio intelligence service and UI',smoke.includes("provider==='app-radio-intelligence'")&&smoke.includes("provider==='app-radio-intelligence-ui'"));
check('smoke test covers tooltip and mobile/desktop mode infrastructure',smoke.includes("provider==='app-radio-tooltips'")&&smoke.includes("['mobile','desktop'].includes(R.uiMode.current())"));

check('diagnostic serializer has circular-reference protection',foundation.includes('const seen=new WeakSet()')&&foundation.includes("return'[Circular]'"));
check('diagnostic serializer handles bigint values',foundation.includes("typeof item==='bigint'")&&foundation.includes('item.toString()'));

// Execute the real foundation serializer against a circular non-Error rejection payload.
{
  const storage=new Map();
  const document={
    documentElement:{dataset:{}},
    head:{appendChild(){}},
    title:'',
    querySelector(){return null},
    createElement(){return{dataset:{},setAttribute(){},append(){},appendChild(){},querySelector(){return null},querySelectorAll(){return[]},remove(){},focus(){}}}
  };
  const R={norm:v=>String(v??'').toLowerCase(),esc:v=>String(v??'')};
  const sandbox={
    window:{R,addEventListener(){}},document,navigator:{onLine:true,serviceWorker:{controller:null}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    Intl,Date,Math,Number,String,Array,Object,Map,Set,WeakSet,JSON,Error,Promise,
    console:{error(){},log(){}},setTimeout(){return 0},clearTimeout(){},structuredClone
  };
  vm.createContext(sandbox);vm.runInContext(foundation,sandbox,{filename:'app-foundation.js'});
  const circular={kind:'probe'};circular.self=circular;
  let item=null,ok=true;try{item=R.reportError(circular,'runtime-hardening',{silent:true})}catch{ok=false}
  check('diagnostics can record a circular non-Error payload without crashing',ok&&String(item?.message||'').includes('[Circular]'));
}

check('season engine still uses last-Sunday A/B boundaries',intelligence.includes('lastSunday(y,2)')&&intelligence.includes('lastSunday(y,9)'));
check('transmitter intelligence refuses missing/invalid coordinates',intelligence.includes("if(!s||!validCoords(s.latitude,s.longitude))return null"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} runtime hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
