(()=>{
const config=Object.freeze({
  version:'3.7.5',
  displayVersion:'V3.7.5',
  codename:'Wrapper Cleanup & Event UI',
  timezone:'Europe/Istanbul',
  locale:'tr-TR',
  cacheVersion:'v375-wrapper-cleanup-20260907-1',
  origin:Object.freeze({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36})
});
globalThis.RADIO_APP_CONFIG=config;
if(typeof document!=='undefined'){
  document.documentElement.dataset.appVersion=config.version;
  document.title=`Radyo Günlüğüm ${config.displayVersion}`;
}
})();
