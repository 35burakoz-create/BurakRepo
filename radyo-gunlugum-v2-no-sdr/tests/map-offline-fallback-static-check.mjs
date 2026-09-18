import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const mapUI=read('app-map-ui.js');
const css=read('app-ui-integrity.css');
const sw=read('sw.js');
const config=read('app-config.js');

new vm.Script(mapUI,{filename:'app-map-ui.js'});
assert(mapUI.includes("function connectionOffline(){return globalThis.navigator?.onLine===false}"),'map must detect an explicit offline browser state');
assert(mapUI.includes("renderFallback(host,rows,'offline')"),'offline map route must render a fallback surface');
assert(mapUI.includes("typeof L==='undefined'")&&mapUI.includes("renderFallback(host,rows,'unavailable')"),'missing Leaflet must render a visible fallback instead of returning silently');
assert(mapUI.includes("renderFallback(host,rows,'empty')"),'zero location records must render an actionable empty state');
assert(mapUI.includes("window.addEventListener('online'")&&mapUI.includes("window.addEventListener('offline'"),'map must rerender when connectivity changes');
assert(mapUI.includes("data-map-open-log")&&mapUI.includes("R.router?.go?.('log'"),'map fallback must link back to the Journal flow');
assert(!mapUI.includes('latitude}</')&&!mapUI.includes('longitude}</'),'fallback list must not expose raw coordinates');
assert(css.includes('.app-map-fallback')&&css.includes('.app-map-fallback-list'),'map fallback must have a dedicated readable surface');
assert(css.includes('.app-map-fallback .btn{min-height:var(--app-touch-min,44px)}'),'fallback action must preserve the canonical touch target');
assert(sw.includes("const MAP_OFFLINE_FALLBACK='20260918-4';"),'service worker must carry the map fallback release marker');
const build=config.match(/buildId:'([^']+)'/)?.[1],generation=sw.match(/PWA_CACHE_GENERATION='([^']+)'/)?.[1];
assert(build==='20260918-4'&&generation===build,'map fallback runtime change must ship with a fresh PWA cache generation');

{
  const host={innerHTML:'',querySelector(){return null},isConnected:true};
  const count={textContent:''};
  const handlers={};
  const R={
    me:{id:'u1'},
    logs:[{id:'1',user_id:'u1',station:'Test Radio',date:'2026-09-18',time:'12:00',frequency:9500,band:'SW5',latitude:38.1,longitude:27.3,location:'Test konumu'}],
    router:{register(){},current:()=> 'map',go(){}},
    events:{on(){}},features:{register(){}},
    esc:v=>String(v??''),freq:()=> '9500 kHz'
  };
  const document={querySelector:s=>s==='#map'?host:s==='#mapCount'?count:null};
  const navigator={onLine:false};
  const sandbox={window:{R,addEventListener(type,fn){handlers[type]=fn}},globalThis:null,navigator,document,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(fn){fn();return 0},clearTimeout(){}};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(mapUI,sandbox,{filename:'app-map-ui.js'});
  R.mapUI.render();
  assert(host.innerHTML.includes('Harita zemini çevrimdışı kullanılamıyor.'),'offline functional fallback must be visible');
  assert(host.innerHTML.includes('1 konumlu kaydın mevcut.')&&host.innerHTML.includes('Test Radio'),'offline fallback must summarize local records without a map');
  navigator.onLine=true;R.logs=[];
  R.mapUI.render();
  assert(host.innerHTML.includes('Henüz konumlu kayıt yok.'),'empty map must explain how to populate the view');
  R.logs=[{id:'2',user_id:'u1',station:'Leaflet Test',date:'2026-09-18',latitude:38.2,longitude:27.4}];
  R.mapUI.render();
  assert(host.innerHTML.includes('Harita bileşeni şu anda yüklenemedi.'),'missing Leaflet functional fallback must be visible');
}

console.log('map-offline-fallback-static-check: ok');
