import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const user=read('app-user-services.js');
const listening=read('app-listening-service.js');
const menu=read('app-menu-ui.js');
const guide=read('app-guide-service.js');
const qsl=read('app-qsl-service.js');
const shell=read('app-shell-core.js');
const sw=read('sw.js');
const css=read('app-audit-polish.css');
const config=read('app-config.js');

for(const [file,src] of [
  ['app-user-services.js',user],['app-listening-service.js',listening],['app-menu-ui.js',menu],
  ['app-guide-service.js',guide],['app-qsl-service.js',qsl],['app-shell-core.js',shell]
]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

check('collections page beyond Supabase default cap',user.includes('fetchUserRows')&&user.includes('.range(from,from+PAGE_SIZE-1)')&&user.includes("'radio_favorites','created_at'")&&user.includes("'radio_reminders','reminder_time'"));
check('reminders have late grace but no early minute trigger',user.includes('REMINDER_GRACE_MINUTES=5')&&user.includes('elapsed=((mins-target)+1440)%1440')&&!user.includes('diff=((target-mins)+1440)%1440'));
check('GPS preference keeps location label and coordinates consistent',user.includes("name.value='Bu cihazın konumu'")&&user.includes('Konum adı ve koordinatlar birlikte kaydedilecek.'));
check('dial calibrations are paged',listening.includes('fetchCalibrations')&&listening.includes("from('radio_dial_calibrations')")&&listening.includes('.range(from,to)'));
check('active listening session is queried independently',listening.includes('fetchActiveSession')&&listening.includes(".eq('status','active')")&&listening.includes("['active-session',active]"));
check('listening session persists coordinates',listening.includes('latitude:location&&')&&listening.includes('longitude:location&&')&&listening.includes('coordinatesForSession'));
check('QSL uses canonical timezone conversion',guide.includes('wallTimeToInstant,utcContext')&&qsl.includes('R.guideService?.wallTimeToInstant?.(date,time)'));
check('menu uses canonical collection loader',menu.includes('R.userServices?.loadCollections?.()')&&!menu.includes("from('radio_favorites').select('*')")&&!menu.includes("from('radio_reminders').select('*')"));
check('menu restores focus and reports reminder toggle failures',menu.includes('returnFocus')&&menu.includes('target?.isConnected')&&menu.includes('menu-reminder-toggle'));
check('wide audit CSS is loaded and cached',shell.includes("css('app-audit-polish.css','appAuditPolishCss')")&&sw.includes("'./app-audit-polish.css'"));
check('wide audit raises microcopy readability',css.includes('font-size:10.5px!important')&&css.includes('.app-radio-glossary-term p')&&css.includes('font-size:12px!important'));
check('wide audit uses dynamic viewport and safe area',css.includes('94dvh')&&css.includes('92dvh')&&css.includes('env(safe-area-inset-bottom)'));
const cache=config.match(/cacheVersion:'v385-core-boundary-[^']*20260910-(\d+)'/);
check('fresh PWA generation for wide audit',!!cache&&Number(cache[1])>=12);

// Functional reminder timing checks with a minimal browser-like sandbox.
{
  const R={
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
    events:{on(){},emit(){}},
    features:{register(){}},
    logs:[],
    guideEntries:[]
  };
  const sandbox={
    window:{R,addEventListener(){}},
    document:{querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},activeElement:null},
    globalThis:null,
    navigator:{},
    Notification:function(){},
    HTMLElement:function(){},
    Intl,Date,Math,Number,String,Array,Object,Promise,console,
    setTimeout(){return 0},setInterval(){return 0},clearTimeout(){},clearInterval(){}
  };
  sandbox.globalThis=sandbox;
  sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}};
  vm.createContext(sandbox);
  vm.runInContext(user,sandbox,{filename:'app-user-services.js'});
  const due=R.userServices.reminderDueContext;
  check('reminder does not fire one minute early',due({reminder_time:'10:00',advance_minutes:10},{date:'2026-09-10',hour:9,minute:49})===null);
  check('reminder fires at target minute',due({reminder_time:'10:00',advance_minutes:10},{date:'2026-09-10',hour:9,minute:50})?.broadcastDate==='2026-09-10');
  check('reminder catches short timer throttling',due({reminder_time:'10:00',advance_minutes:10},{date:'2026-09-10',hour:9,minute:54})?.elapsed===4);
  check('midnight reminder keeps correct broadcast date',due({reminder_time:'00:05',advance_minutes:10},{date:'2026-09-11',hour:0,minute:0})?.broadcastDate==='2026-09-11');
}

// Functional timezone and session-coordinate checks.
{
  const R={
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
    events:{on(){},emit(){}},
    features:{register(){}},
    clock:{today:()=> '2026-09-10',time:()=> '12:00'},
    logs:[],bandProfiles:[],guideEntries:[]
  };
  const sandbox={
    window:{R},
    globalThis:null,
    Intl,Date,Math,Number,String,Array,Object,Map,Promise,console,
    setTimeout(){return 0}
  };
  sandbox.globalThis=sandbox;
  sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36},receiver:{bands:{}}};
  vm.createContext(sandbox);
  vm.runInContext(guide,sandbox,{filename:'app-guide-service.js'});
  vm.runInContext(qsl,sandbox,{filename:'app-qsl-service.js'});
  check('QSL current Turkey wall time converts to UTC',R.qslService.utcStamp({date:'2026-09-10',time:'04:30'}).time==='01:30');
  check('QSL historical Turkey offset is not hard-coded',R.qslService.utcStamp({date:'2015-01-10',time:'04:00'}).time==='02:00');

  R.listeningOrigin=()=>({name:'Yeni konum',lat:40,lon:29});
  vm.runInContext(listening,sandbox,{filename:'app-listening-service.js'});
  const coords=R.listening.coordinatesForSession;
  const stored=coords({location:'Eski konum',latitude:38.1,longitude:27.2});
  const unknown=coords({location:'Eski konum'});
  check('session coordinates stay pinned after preference changes',stored.lat===38.1&&stored.lon===27.2);
  check('mismatched legacy session does not invent coordinates',unknown.lat===null&&unknown.lon===null);
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} wide-audit checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
