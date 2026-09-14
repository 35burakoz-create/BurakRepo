import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

const user=read('app-user-services.js');
const calendar=read('app-calendar-ui.js');
const analysis=read('app-analysis-ui.js');
const mapUI=read('app-map-ui.js');
const atlasUI=read('app-atlas-ui.js');
const backup=read('app-backup.js');
const menu=read('app-menu-ui.js');

for(const [file,src] of [
  ['app-user-services.js',user],['app-calendar-ui.js',calendar],['app-analysis-ui.js',analysis],
  ['app-map-ui.js',mapUI],['app-atlas-ui.js',atlasUI],['app-backup.js',backup],['app-menu-ui.js',menu]
]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

// Reminder, favorite and preferences races.
check('favorite mutations are coalesced per account and guide row',user.includes('favoriteFlights=new Map()')&&user.includes('if(favoriteFlights.has(key))return favoriteFlights.get(key)'));
check('favorite lookup requires an exact active-account owner match',user.includes("x?.user_id===userId&&String(x.guide_entry_id)===String(id)"));
check('reminder saves are coalesced',user.includes('reminderSaveFlights=new Map()')&&user.includes('if(reminderSaveFlights.has(key))return reminderSaveFlights.get(key)'));
check('duplicate enabled reminders are rejected before another insert',user.includes("toast('Bu yayın için aynı hatırlatıcı zaten var.')"));
check('reminder due calculation validates current date and wall clock',user.includes("/^\\d{4}-\\d{2}-\\d{2}$/.test(date)")&&user.includes('nowH<0||nowH>23')&&user.includes('nowM<0||nowM>59'));
check('preference GPS requests carry an invalidation generation',user.includes('prefsGeoGeneration')&&user.includes('token=++prefsGeoGeneration'));
check('preference GPS completion is pinned to account and live dialog',user.includes('R.me?.id!==userId||!m.isConnected')&&user.includes('token!==prefsGeoGeneration'));
check('closing preferences invalidates pending GPS',user.includes("if(id==='appPrefs')prefsGeoGeneration++"));
check('user-services delegated clicks tolerate non-Element targets',user.includes('e.target instanceof Element?e.target:null'));

// Calendar and analytics data quality.
check('calendar requires exact ISO dates',calendar.includes("match(/^(\\d{4})-(\\d{2})-(\\d{2})$/)"));
check('calendar verifies actual Gregorian date existence',calendar.includes('x.getUTCFullYear()===y')&&calendar.includes('x.getUTCMonth()===mo-1')&&calendar.includes('x.getUTCDate()===d'));
check('calendar aggregation no longer uses permissive startsWith date matching',!calendar.includes("x.date?.startsWith(value)"));
check('calendar delegated clicks tolerate non-Element targets',calendar.includes('e.target instanceof Element?e.target:null'));
check('analysis rejects signal values outside personal 1-5 scale',analysis.includes('Number.isFinite(v)&&v>=1&&v<=5'));
check('analysis rejects malformed legacy clock values',analysis.includes('function validClockTime')&&analysis.includes('h>=0&&h<=23')&&analysis.includes('min>=0&&min<=59')&&analysis.includes('sec>=0&&sec<=59'));
check('analysis is account and receiver-band scoped',analysis.includes('function ownedLogs()')&&analysis.includes('x?.user_id===userId')&&analysis.includes('allowed.has(String(x?.band||'));

// Map and atlas lifecycle.
check('map delayed renders carry an invalidation generation',mapUI.includes('renderGeneration')&&mapUI.includes('function scheduleRender'));
check('leaving map invalidates delayed render work',mapUI.includes("x?.from==='map'&&x?.to!=='map'")&&mapUI.includes('renderGeneration++'));
check('map destroys stale markers on authenticated account switch',mapUI.includes('changedAccount=!!x?.previousUserId&&x.previousUserId!==userId')&&mapUI.includes('if(!x?.authenticated||changedAccount)destroy()'));
check('atlas geolocation has a generation guard',atlasUI.includes('geoGeneration')&&atlasUI.includes('token=++geoGeneration'));
check('atlas GPS result pins account route and button lifetime',atlasUI.includes("R.router?.current?.()!=='atlas'")&&atlasUI.includes('R.me?.id!==userId')&&atlasUI.includes('!geo.isConnected'));
check('leaving atlas invalidates pending geolocation',atlasUI.includes("x?.from==='atlas'&&x?.to!=='atlas'")&&atlasUI.includes('geoGeneration++'));
check('atlas destroys map on authenticated account switch',atlasUI.includes('changedAccount=!!x?.previousUserId&&x.previousUserId!==userId')&&atlasUI.includes('destroyMap()'));
check('atlas delegated clicks tolerate non-Element targets',atlasUI.includes('e.target instanceof Element?e.target:null'));

// Backup/export hardening.
check('CSV string cells neutralize spreadsheet formulas',backup.includes("/^[\\t\\r\\n ]*[=+\\-@]/")&&backup.includes("`'${v}`"));
check('backup filters explicitly foreign in-memory log rows',backup.includes('function ownedLogs(')&&backup.includes('x?.user_id==null||x.user_id===userId'));
check('full JSON metadata uses account-filtered logs',backup.includes('logs:ownedLogs(userId)'));
check('CSV export uses account-filtered logs',backup.includes('const logs=ownedLogs(userId)'));
check('backup still aborts when account changes mid-export',backup.includes('assertUser(userId)')&&backup.includes('Oturum değişti; yedekleme güvenli biçimde durduruldu.'));

// Diagnostic privacy between accounts.
check('diagnostic owner identity is persisted separately',menu.includes("DIAG_OWNER_KEY='radio-diagnostics-owner-v1'"));
check('diagnostic history clears on owner transition',menu.includes('if(transitioned){R.diagnostics?.clear?.()'));
check('open diagnostics DOM is removed on account transition',menu.includes("$('#foundationDiagOverlay')?.remove();$('#foundationDiag')?.remove()"));
check('diagnostic isolation is executed from auth transition',menu.includes('isolateDiagnostics(userId,x?.previousUserId||null)'));

// Functional reminder time math, especially across midnight.
{
  const R={
    me:{id:'u1'},logs:[],guideEntries:[],favorites:[],reminders:[],achievementDefs:[],
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),events:{on(){},emit(){}},features:{register(){}},
    clock:{today:()=> '2026-09-14',time:()=> '12:00',parts:()=>({date:'2026-09-14',hour:12,minute:0})}
  };
  const document={querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},activeElement:null};
  const sandbox={window:{R},globalThis:null,document,navigator:{},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,alert(){},setTimeout(){return 0},setInterval(){return 0},Element:class{},HTMLElement:class{}};
  sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',origin:{name:'Bozköy',lat:38.151,lon:27.36}};
  vm.createContext(sandbox);vm.runInContext(user,sandbox,{filename:'app-user-services.js'});
  const beforeMidnight=R.userServices.reminderDueContext({reminder_time:'00:05',advance_minutes:10},{date:'2026-09-14',hour:23,minute:55});
  check('00:05 broadcast with 10-minute advance targets 23:55 previous date',beforeMidnight?.target===1435&&beforeMidnight?.broadcastDate==='2026-09-15');
  const afterMidnight=R.userServices.reminderDueContext({reminder_time:'00:05',advance_minutes:10},{date:'2026-09-15',hour:0,minute:0});
  check('reminder remains due within grace window after midnight',afterMidnight?.elapsed===5&&afterMidnight?.broadcastDate==='2026-09-15');
  check('invalid reminder clock context is rejected',R.userServices.reminderDueContext({reminder_time:'12:00',advance_minutes:0},{date:'2026-09-15',hour:25,minute:0})===null);
  check('malformed reminder date is rejected',R.userServices.reminderDueContext({reminder_time:'12:00',advance_minutes:0},{date:'2026-09-15x',hour:12,minute:0})===null);

  let resolveInsert,insertCalls=0;
  R.guideEntries=[{id:'g1',station:'Test Radio',mode:'SW',band:'SW9',frequency:17650,unit:'kHz'}];
  R.S={from(){return{insert(){insertCalls++;return new Promise(resolve=>{resolveInsert=resolve})}}}};
  const one=R.userServices.toggleFavorite('g1'),two=R.userServices.toggleFavorite('g1');
  check('double favorite action starts one database insert',insertCalls===1);
  R.me={id:'u2'};resolveInsert({error:null});await Promise.all([one,two]);
  check('coalesced favorite action completes safely after account transition',insertCalls===1);
}

// Functional calendar date validator.
{
  const R={router:{register(){}},events:{on(){}},features:{register(){}}};
  const document={querySelector(){return null}};
  const sandbox={window:{R},document,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0},Element:class{}};
  vm.createContext(sandbox);vm.runInContext(calendar,sandbox,{filename:'app-calendar-ui.js'});
  check('calendar accepts real leap day',R.calendarUI.validIsoDate('2024-02-29')===true);
  check('calendar rejects impossible non-leap day',R.calendarUI.validIsoDate('2026-02-29')===false);
  check('calendar rejects ISO-looking suffix garbage',R.calendarUI.validIsoDate('2026-09-14-extra')===false);
  check('calendar rejects impossible day 31 in April',R.calendarUI.validIsoDate('2026-04-31')===false);
}

// Functional analytics: corrupt signals, bad clocks, foreign accounts and unsupported bands must not affect results.
{
  const card={innerHTML:''};
  const R={
    me:{id:'u1'},B:['MW'],
    logs:[
      {user_id:'u1',band:'MW',signal_strength:1,time:'01:15'},
      {user_id:'u1',band:'MW',signal_strength:5,time:'02:30'},
      {user_id:'u1',band:'MW',signal_strength:99,time:'03:10'},
      {user_id:'u1',band:'MW',signal_strength:-3,time:'04:10'},
      {user_id:'u1',band:'MW',signal_strength:4,time:'03:99'},
      {user_id:'u1',band:'SW99',signal_strength:1,time:'05:10'},
      {user_id:'u2',band:'MW',signal_strength:1,time:'06:10'}
    ],
    router:{register(){}},events:{on(){}},features:{register(){}}
  };
  const document={querySelector:s=>s==='#analysisCards'?card:null};
  const sandbox={window:{R},document,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  vm.createContext(sandbox);vm.runInContext(analysis,sandbox,{filename:'app-analysis-ui.js'});R.analysisUI.render();
  check('analytics average ignores corrupt, foreign and unsupported-band signal rows',card.innerHTML.includes('<b>3.3</b>'));
  check('analytics clock validator rejects impossible minute values',R.analysisUI.validClockTime('03:99')===null);
  check('analytics owned rows exclude foreign account and unsupported band',R.analysisUI.ownedLogs().length===5);
}

// Functional backup ownership and CSV neutralization.
{
  const R={
    me:{id:'u1'},logs:[{id:'1',user_id:'u1',station:'=HYPERLINK("https://example.invalid")'},{id:'2',user_id:'u2',station:'Foreign'}],
    events:{on(){}},features:{register(){}},clock:{today:()=> '2026-09-14'}
  };
  const sandbox={window:{R},globalThis:null,document:{querySelector(){return null}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,alert(){}};
  sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',version:'3.8.5'};
  vm.createContext(sandbox);vm.runInContext(backup,sandbox,{filename:'app-backup.js'});
  check('backup ownedLogs excludes an explicitly foreign row',R.backup.ownedLogs('u1').length===1&&R.backup.ownedLogs('u1')[0].id==='1');
  check('CSV dangerous formula string receives apostrophe prefix',R.backup.csvSafe('=2+2')==="'=2+2");
  check('CSV dangerous at-sign string receives apostrophe prefix',R.backup.csvSafe('@SUM(A1:A2)')==="'@SUM(A1:A2)");
  check('numeric negative coordinate remains numeric',R.backup.csvSafe(-27.36)===-27.36);
  check('ordinary text is unchanged by CSV neutralizer',R.backup.csvSafe('Radio Romania')==='Radio Romania');
}

// Functional diagnostic isolation across accounts.
{
  const store=new Map([['radio-diagnostics-owner-v1','u1']]);let cleared=0,authHandler=null;
  const R={
    me:{id:'u2'},diagnostics:{clear(){cleared++},snapshot(){return{errors:[{message:'old'}]}}},
    events:{on(name,fn){if(name==='auth:changed')authHandler=fn}},features:{register(){}},toast(){},S:{from(){return{}}}
  };
  const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
  const document={querySelector(){return null},addEventListener(){},documentElement:{classList:{remove(){},toggle(){}}},body:{classList:{toggle(){},contains(){return false}}}};
  const sandbox={window:{R},document,localStorage,HTMLElement:class{},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console};
  vm.createContext(sandbox);vm.runInContext(menu,sandbox,{filename:'app-menu-ui.js'});
  authHandler?.({user:{id:'u2'},authenticated:true,previousUserId:'u1'});
  check('diagnostics clear when stored owner changes',cleared===1);
  check('diagnostic owner marker advances to new account',store.get('radio-diagnostics-owner-v1')==='u2');
  authHandler?.({user:{id:'u2'},authenticated:true,previousUserId:'u2'});
  check('same-account auth refresh does not clear diagnostics again',cleared===1);
}

// Functional map coordinate filtering stays strict.
{
  const handlers={};
  const R={logs:[{latitude:38.1,longitude:27.3},{latitude:95,longitude:27},{latitude:'x',longitude:10}],router:{register(){},current:()=> 'map'},events:{on(name,fn){handlers[name]=fn}},features:{register(){}}};
  const sandbox={window:{R,addEventListener(){}},globalThis:null,document:{querySelector(){return null}},Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0},clearTimeout(){}};
  sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={origin:{lat:38.151,lon:27.36}};
  vm.createContext(sandbox);vm.runInContext(mapUI,sandbox,{filename:'app-map-ui.js'});
  check('map points reject invalid latitude and non-numeric coordinates',R.mapUI.points().length===1);
  check('map coordinate validator accepts longitude edge',R.mapUI.validCoord(0,180)===true);
  check('map coordinate validator rejects longitude overflow',R.mapUI.validCoord(0,180.01)===false);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} secondary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
