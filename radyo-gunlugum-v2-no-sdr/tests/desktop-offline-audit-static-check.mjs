import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const desktop=read('app-desktop.css');
const shell=read('app-shell-core.js');
const search=read('v44-search-rebuild.js');
const log=read('app-log-ui.js');
const offline=read('app-offline-service.js');
const atlas=read('app-atlas-service.js');
const atlasUI=read('app-atlas-ui.js');
const mapUI=read('app-map-ui.js');
const sw=read('sw.js');

for(const [file,src] of [['app-shell-core.js',shell],['v44-search-rebuild.js',search],['app-log-ui.js',log],['app-offline-service.js',offline],['app-atlas-service.js',atlas],['app-atlas-ui.js',atlasUI],['app-map-ui.js',mapUI]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}check(`syntax ${file}`,ok)
}

check('desktop stylesheet is loaded after shell polish',shell.includes("css('app-desktop.css','appDesktopCss')"));
check('desktop stylesheet is cached for installed PWA',sw.includes("'./app-desktop.css'"));
check('desktop expands shell beyond mobile width',desktop.includes('@media (min-width:960px)')&&desktop.includes('max-width:1120px!important'));
check('desktop restores authenticated user box',desktop.includes('#userBox:not(.hidden){display:flex!important}'));
check('large desktop converts bottom dock into side rail',desktop.includes('@media (min-width:1280px)')&&desktop.includes('top:50%!important')&&desktop.includes('grid-template-columns:1fr!important'));
check('large desktop no longer reserves mobile bottom dock space',desktop.includes('body{padding-bottom:0!important}')&&desktop.includes('#appView{padding-bottom:38px!important}'));
check('fine pointer devices receive desktop hover treatment',desktop.includes('@media (hover:hover) and (pointer:fine)'));

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

check('offline sync flights are keyed by account',offline.includes('syncFlights=new Map()')&&offline.includes('syncFlights.has(userId)')&&offline.includes('syncFlights.set(userId,flight)'));
check('offline list only returns active account rows',offline.includes('async function list(userId=R.me?.id||null)')&&offline.includes('rows.filter(x=>ownerOf(x)===userId)'));
check('offline transaction resolves only on transaction complete',offline.includes('t.oncomplete=()=>')&&offline.includes('resolve(result)'));
check('offline sync aborts safely after account transition',offline.includes("if(R.me?.id!==userId){interrupted=true;break}"));
check('offline UI updates only for the active account',offline.includes('if(R.me?.id===userId){if(synced)'));

check('atlas has canonical coordinate range validator',atlas.includes('function validCoords(lat,lon)')&&atlas.includes('a>=-90&&a<=90')&&atlas.includes('b>=-180&&b<=180'));
check('atlas manual origin rejects impossible coordinates',atlas.includes("if(!validCoords(lat,lon))throw new Error"));
check('atlas haversine clamps floating point domain',atlas.includes('Math.min(1,Math.max(0,raw))'));
check('atlas ignores non-finite legacy frequencies',atlas.includes('if(!Number.isFinite(f))continue'));
check('atlas destroys Leaflet instance before replacing map DOM',atlasUI.includes('function destroyMap()')&&atlasUI.includes('destroyMap();root.innerHTML='));
check('atlas detects a replaced Leaflet host node',atlasUI.includes('if(map&&mapHost!==node)destroyMap()'));
check('atlas invalidates map size after desktop resize',atlasUI.includes("window.addEventListener('resize',resizeMap")&&atlasUI.includes('map.invalidateSize?.({pan:false})'));
check('location map invalidates size after desktop resize',mapUI.includes("window.addEventListener('resize',resizeMap")&&mapUI.includes('map.invalidateSize?.({pan:false})'));
check('both Leaflet views release maps on sign out',atlasUI.includes("if(!x?.authenticated)destroyMap()")&&mapUI.includes("if(!x?.authenticated)destroy()"));

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
console.log(`\n${checks.length-failed.length}/${checks.length} desktop/offline audit checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
