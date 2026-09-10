(()=>{
const config=Object.freeze({
  version:'3.9.0',
  displayVersion:'V3.9.0',
  codename:'A26 Schedule Integration',
  timezone:'Europe/Istanbul',
  locale:'tr-TR',
  cacheVersion:'v390-a26-schedules-20260910-1',
  origin:Object.freeze({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36})
});
globalThis.RADIO_APP_CONFIG=config;
if(typeof document!=='undefined'){
  document.documentElement.dataset.appVersion=config.version;
  document.title=`Radyo Günlüğüm ${config.displayVersion}`;
}
})();
