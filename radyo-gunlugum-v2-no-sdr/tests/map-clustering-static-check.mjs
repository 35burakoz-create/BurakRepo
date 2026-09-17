import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const mapSource=fs.readFileSync(path.join(root,'app-map-ui.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
new Function(mapSource);

assert(mapSource.includes('CLUSTER_DECIMALS=4'),'map clustering must use a narrow near-identical coordinate bucket');
assert(mapSource.includes('function clusters(rows=points())')&&mapSource.includes('const grouped=new Map()'),'map grouping must stay linear-time and dependency-free');
assert(mapSource.includes("L.divIcon")&&mapSource.includes('app-map-cluster-icon'),'overlapping records must render as a visible count marker');
assert(mapSource.includes('POPUP_LIMIT=6')&&mapSource.includes('+${more} kayıt daha'),'large clusters must keep popups bounded');
assert(mapSource.includes('rows.length===grouped.length')&&mapSource.includes('harita noktası'),'map summary must distinguish record count from rendered map points');
assert(mapSource.includes("x?.user_id==null")&&mapSource.includes('x.user_id===userId'),'clustering must preserve the P0/P1 active-account scope');
assert(!mapSource.includes('markerClusterGroup')&&!mapSource.includes('leaflet.markercluster'),'clustering must not add a new Leaflet plugin dependency');
assert(sw.includes("const MAP_RECORD_CLUSTERING='20260917-12';"),'service worker must carry a fresh map-clustering release marker');

const R={
  me:{id:'u1'},
  logs:[
    {id:'a',user_id:'u1',latitude:38.151041,longitude:27.360041,station:'A',date:'2026-09-17',time:'10:00',band:'MW',frequency:702},
    {id:'b',user_id:'u1',latitude:38.151044,longitude:27.360044,station:'B',date:'2026-09-17',time:'11:00',band:'MW',frequency:891},
    {id:'legacy',user_id:null,latitude:38.2,longitude:27.4,station:'Legacy',date:'2026-09-16',time:'12:00',band:'FM',frequency:99.2},
    {id:'foreign',user_id:'u2',latitude:38.151043,longitude:27.360043,station:'Foreign',date:'2026-09-17',time:'12:00',band:'MW',frequency:999}
  ],
  listeningOrigin:()=>({lat:38.151,lon:27.36}),
  router:{register(){},current(){return'map'}},events:{on(){}},features:{register(){}},esc:v=>String(v??''),freq:x=>String(x.frequency)
};
const document={querySelector(){return null}};
const sandbox={window:{R,addEventListener(){}},document,globalThis:null,console,Map,Number,String,Math,Array,Object,setTimeout(){return 0},clearTimeout(){}};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(mapSource,sandbox,{filename:'app-map-ui.js'});
const points=R.mapUI.points();
assert.equal(points.length,3,'active account scope must exclude foreign map rows while preserving ownerless legacy rows');
const groups=R.mapUI.clusters(points);
assert.equal(groups.length,2,'two near-identical coordinates should collapse into one cluster while a distant point remains separate');
const crowded=groups.find(x=>x.count===2);
assert(crowded&&crowded.rows.map(x=>x.id).sort().join(',')==='a,b','cluster must retain its underlying listening records');
assert(Math.abs(crowded.lat-38.1510425)<1e-9&&Math.abs(crowded.lon-27.3600425)<1e-9,'cluster marker must use the mean coordinate instead of arbitrarily choosing one record');
assert(R.mapUI.clusterPopup(crowded).includes('2 dinleme kaydı'),'multi-record popup must explain the cluster count');
assert.equal(R.mapUI.clusterKey(38.151041,27.360041),R.mapUI.clusterKey(38.151044,27.360044),'near-identical coordinates must share the same map bucket');
assert.notEqual(R.mapUI.clusterKey(38.151041,27.360041),R.mapUI.clusterKey(38.2,27.4),'distant coordinates must stay in separate buckets');

console.log('map-clustering-static-check: ok');
