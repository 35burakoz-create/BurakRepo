import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const uiMode=read('app-ui-mode.js');
const desktop=read('app-desktop.css');
const shell=read('app-shell-core.js');
const router=read('app-router-core.js');
const search=read('v44-search-rebuild.js');
const log=read('app-log-ui.js');
const logForm=read('app-log-form-ui.js');
const offline=read('app-offline-service.js');
const atlas=read('app-atlas-service.js');
const atlasUI=read('app-atlas-ui.js');
const mapUI=read('app-map-ui.js');
const backup=read('app-backup.js');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');

for(const [file,src] of [['app-ui-mode.js',uiMode],['app-shell-core.js',shell],['app-router-core.js',router],['v44-search-rebuild.js',search],['app-log-ui.js',log],['app-log-form-ui.js',logForm],['app-offline-service.js',offline],['app-atlas-service.js',atlas],['app-atlas-ui.js',atlasUI],['app-map-ui.js',mapUI],['app-backup.js',backup]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}check(`syntax ${file}`,ok)
}

function simulateUiMode({ua='',uaMobile=false,platform='',touch=0,standalone=false,coarse=false,fine=false,screenWidth=1920,screenHeight=1080,innerWidth=1280,innerHeight=720}={}){
  const rootEl={dataset:{},classList:{toggle(){}}};
  const navigator={userAgent:ua,userAgentData:{mobile:uaMobile},platform,maxTouchPoints:touch,standalone:false};
  const listeners=[];
  const window={R:{},navigator,screen:{width:screenWidth,height:screenHeight},innerWidth,innerHeight,matchMedia(q){return{matches:q==='(display-mode: standalone)'?standalone:q==='(pointer: coarse)'?coarse:q==='(pointer: fine)'?fine:false,addEventListener(){}}},dispatchEvent(e){listeners.push(e)},addEventListener(){}};
  const sandbox={window,document:{documentElement:rootEl},navigator,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},Object,Number,String,Math,console};
  vm.createContext(sandbox);vm.runInContext(uiMode,sandbox,{filename:'app-ui-mode.js'});
  return{state:window.R.uiMode.state,root:rootEl,events:listeners};
}

{
  const d=simulateUiMode({ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',fine:true,screenWidth:1920,screenHeight:1080,innerWidth:520,innerHeight:700});
  check('narrow desktop browser stays desktop instead of becoming mobile',d.state.mode==='desktop'&&d.state.context==='browser'&&d.root.dataset.uiMode==='desktop');
  const p=simulateUiMode({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile',touch:5,standalone:true,coarse:true,screenWidth:390,screenHeight:844,innerWidth:844,innerHeight:390});
  check('landscape installed phone stays mobile app',p.state.mode==='mobile'&&p.state.context==='app'&&p.root.dataset.uiMode==='mobile');
  const a=simulateUiMode({ua:'Mozilla/5.0 (Linux; Android 16; Pixel) Mobile',uaMobile:true,touch:5,coarse:true,screenWidth:412,screenHeight:915,innerWidth:915,innerHeight:412});
  check('wide landscape Android browser remains mobile hardware',a.state.mode==='mobile');
  const t=simulateUiMode({ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',touch:10,coarse:true,fine:true,screenWidth:1366,screenHeight:768});
  check('touch capable computer with fine pointer remains desktop',t.state.mode==='desktop');
  const i=simulateUiMode({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',platform:'MacIntel',touch:5,coarse:true,fine:false,screenWidth:1024,screenHeight:1366});
  check('touch iPad style device remains mobile',i.state.mode==='mobile');
}

check('UI mode contract loads before other bootstrap modules',boot.includes("const MODULES=[\n'app-ui-mode.js','app-foundation.js'"));
check('UI mode contract is a critical bootstrap module',boot.includes("'app-ui-mode.js'" )&&boot.includes('const CRITICAL=new Set'));
check('UI mode contract is cached and critical offline',sw.includes("'./app-ui-mode.js'")&&sw.match(/const CRITICAL=\[[^\]]*'\.\/app-ui-mode\.js'/s));
check('desktop stylesheet is loaded after shell polish',shell.includes("css('app-desktop.css','appDesktopCss')"));
check('desktop stylesheet is cached for installed PWA',sw.includes("'./app-desktop.css'"));
check('desktop styling is explicitly scoped to desktop mode',desktop.includes('html[data-ui-mode="desktop"] body')&&desktop.includes('html[data-ui-mode="desktop"] #appDesktopNav'));
check('mobile mode explicitly excludes desktop navigation',desktop.includes('html[data-ui-mode="mobile"] #appDesktopNav{display:none!important}'));
check('desktop mode explicitly excludes mobile dock',desktop.includes('html[data-ui-mode="desktop"] #v38Dock{display:none!important}'));
check('desktop uses a separate navigation DOM',shell.includes("d.id='appDesktopNav'")&&shell.includes("d.className='app-desktop-nav'"));
check('mobile dock is created only in mobile mode',shell.includes("if(mode()!=='mobile'){$('#v38Dock')?.remove();return null}"));
check('desktop navigation is created only in desktop mode',shell.includes("if(mode()!=='desktop'){$('#appDesktopNav')?.remove();return null}"));
check('desktop navigation removes mobile dock',shell.includes("if(mode()==='desktop'){$('#v38Dock')?.remove();return ensureDesktopNav()}"));
check('mobile navigation removes desktop navigation',shell.includes("$('#appDesktopNav')?.remove();return ensureDock()"));
check('desktop navigation exposes desktop-specific primary tools',shell.includes('data-route="propagation"')&&shell.includes('data-route="memory"')&&shell.includes('desktop-quick'));
check('desktop navigation can become a wide-screen side rail',desktop.includes('@media (min-width:1280px)')&&desktop.includes('flex-direction:column')&&desktop.includes('position:fixed'));
check('large desktop no longer reserves mobile bottom dock space',desktop.includes('html[data-ui-mode="desktop"] body{padding-bottom:0!important}')&&desktop.includes('html[data-ui-mode="desktop"] #appView{padding-bottom:38px!important}'));
check('fine pointer hover treatment is desktop-scoped',desktop.includes('@media (hover:hover) and (pointer:fine)')&&desktop.includes('html[data-ui-mode="desktop"] #appDesktopNav button:hover'));
check('shell refreshes when UI mode context changes',shell.includes("window.addEventListener('app:uimode',()=>refresh())"));
check('global search is not injected on signed-out screen',shell.includes("if(!top||!R.me||$('#appView')?.classList.contains('hidden')){old?.remove();return null}"));
check('sign out removes both navigation shells and search',shell.includes('removeNavigation()')&&shell.includes("$('[data-v44search]')?.remove()"));
check('shell click delegation tolerates non-Element targets',shell.includes('e.target instanceof Element?e.target:null'));
check('router updates both desktop and mobile active navigation',router.includes("#v38Dock [data-route],#appDesktopNav [data-route]")&&router.includes("setAttribute('aria-current','page')"));
check('router ignores malformed encoded hashes instead of crashing',router.includes('try{h=decodeURIComponent(location.hash||\'\')}catch(error)')&&router.includes("R.reportError?.(error,'router-hash',{silent:true})"));
check('router sync rejects stale unknown stored routes',router.includes("next=router.has(candidate)?candidate:'home'"));
check('router click delegation tolerates non-Element targets',router.includes('e.target instanceof Element?e.target:null'));

check('shell traps Tab inside the top visible modal',shell.includes('function trapModalFocus(e)')&&shell.includes("if(e.key!=='Tab')return")&&shell.includes('visibleModal()'));
check('modal focus trap wraps first and last controls',shell.includes('e.shiftKey&&active===first')&&shell.includes('active===last'));
check('global search advertises desktop shortcut',shell.includes('⌘/Ctrl K'));
check('global search supports Ctrl or Command K',search.includes("(e.ctrlKey||e.metaKey)")&&search.includes("toLowerCase()==='k'"));
check('global search restores opener focus on close',search.includes('returnFocus')&&search.includes('target?.isConnected')&&search.includes('target.focus?.()'));
check('global search submit keeps keyboard focus in dialog',search.includes("render(input.value,{submitted:true});input.focus()"));

check('journal record headers are keyboard focusable',log.includes('role="button" tabindex="0" aria-expanded="false"'));
check('journal supports Enter and Space expansion',log.includes("['Enter',' '].includes(e.key)")&&log.includes('toggleRecord'));
check('journal expansion updates aria-expanded',log.includes("setAttribute('aria-expanded',expanded?'true':'false')"));
check('journal filter button exposes expanded state',log.includes('data-log-filters aria-expanded="false"')&&log.includes("filterButton.setAttribute('aria-expanded'"));
check('opening journal filters moves focus into search',log.includes("if(open)setTimeout(()=>$('#search')?.focus(),0)"));
check('online journal submits are coalesced per account',logForm.includes('saveFlights=new Map()')&&logForm.includes('saveFlights.has(userId)')&&logForm.includes('saveFlights.set(userId,true)'));
check('online journal save completion cannot reset another account form',logForm.includes('if(activeUserId()!==userId)return')&&logForm.includes('if(activeUserId()===userId&&msg)'));
check('journal cancel stays blocked while its account save is active',logForm.includes('cancel.disabled=true')&&logForm.includes('if(!isSaving())reset()'));

check('offline sync flights are keyed by account',offline.includes('syncFlights=new Map()')&&offline.includes('syncFlights.has(userId)')&&offline.includes('syncFlights.set(userId,flight)'));
check('offline list only returns active account rows',offline.includes('async function list(userId=R.me?.id||null)')&&offline.includes('rows.filter(x=>ownerOf(x)===userId)'));
check('offline transaction resolves only on transaction complete',offline.includes('t.oncomplete=()=>')&&offline.includes('resolve(result)'));
check('offline sync aborts safely after account transition',offline.includes("if(R.me?.id!==userId){interrupted=true;break}"));
check('offline UI updates only for the active account',offline.includes('if(R.me?.id===userId){if(synced)'));
check('offline journal submits are coalesced per account',offline.includes('formQueueFlights=new Map()')&&offline.includes('formQueueFlights.has(userId)')&&offline.includes('formQueueFlights.set(userId,true)'));
check('offline form result never resets a different account form',offline.includes("if(R.me?.id===userId){R.reset?.()"));

check('atlas has canonical coordinate range validator',atlas.includes('function validCoords(lat,lon)')&&atlas.includes('a>=-90&&a<=90')&&atlas.includes('b>=-180&&b<=180'));
check('atlas manual origin rejects impossible coordinates',atlas.includes("if(!validCoords(lat,lon))throw new Error"));
check('atlas haversine clamps floating point domain',atlas.includes('Math.min(1,Math.max(0,raw))'));
check('atlas ignores non-finite legacy frequencies',atlas.includes('if(!Number.isFinite(f))continue'));
check('atlas destroys Leaflet instance before replacing map DOM',atlasUI.includes('function destroyMap()')&&atlasUI.includes('destroyMap();root.innerHTML='));
check('atlas detects a replaced Leaflet host node',atlasUI.includes('if(map&&mapHost!==node)destroyMap()'));
check('atlas invalidates map size after desktop resize',atlasUI.includes("window.addEventListener('resize',resizeMap")&&atlasUI.includes('map.invalidateSize?.({pan:false})'));
check('location map invalidates size after desktop resize',mapUI.includes("window.addEventListener('resize',resizeMap")&&mapUI.includes('map.invalidateSize?.({pan:false})'));
check('both Leaflet views release maps on sign out',atlasUI.includes("if(!x?.authenticated)destroyMap()")&&mapUI.includes("if(!x?.authenticated)destroy()"));

check('full backup pins the initiating account',backup.includes('const userId=activeUserId()')&&backup.includes('assertUser(userId)')&&backup.includes("fetchUserRows('radio_favorites','created_at',userId)"));
check('backup pagination never rereads account identity mid-page',backup.includes(".eq('user_id',userId)")&&backup.includes('fetchAudioManifest(userId=activeUserId())'));
check('offline backup explicitly requests the same account queue',backup.includes('R.offline.list(userId)'));
check('backup aborts rather than exporting after account switch',backup.includes('Oturum değişti; yedekleme güvenli biçimde durduruldu.'));
check('CSV export blocks duplicate desktop clicks',backup.includes('csv.disabled=true')&&backup.includes('finally{csv.disabled=false}'));

{
  const R={logs:[],events:{emit(){},on(){}},features:{register(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR')};
  const sandbox={window:{R},globalThis:{RADIO_APP_CONFIG:{origin:{name:'Bozköy',lat:38.151,lon:27.36}}},Number,String,Array,Object,Map,Set,Math,console};
  sandbox.window.window=sandbox.window;vm.createContext(sandbox);vm.runInContext(atlas,sandbox,{filename:'app-atlas-service.js'});
  check('atlas validator accepts normal Turkey coordinate',R.atlas.validCoords(38.151,27.36)===true);
  check('atlas validator rejects latitude above 90',R.atlas.validCoords(95,27)===false);
  check('atlas validator rejects longitude above 180',R.atlas.validCoords(38,240)===false);
  const antipodal=R.atlas.distance([0,0],[0,180]);
  check('atlas antipodal distance remains finite',Number.isFinite(antipodal)&&antipodal>20000&&antipodal<20100);
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} desktop/mobile isolation and audit checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
