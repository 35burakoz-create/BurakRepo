(()=>{
const config=Object.freeze({
  version:'3.8.4',
  displayVersion:'V3.8.4',
  codename:'Direct Legacy Cleanup',
  timezone:'Europe/Istanbul',
  locale:'tr-TR',
  cacheVersion:'v384-direct-legacy-cleanup-20260907-1',
  origin:Object.freeze({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36})
});
globalThis.RADIO_APP_CONFIG=config;
if(typeof document!=='undefined'){
  document.documentElement.dataset.appVersion=config.version;
  document.title=`Radyo Günlüğüm ${config.displayVersion}`;
}
})();