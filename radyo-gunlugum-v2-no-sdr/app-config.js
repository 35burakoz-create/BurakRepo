(()=>{
const config=Object.freeze({
  version:'3.8.2',
  displayVersion:'V3.8.2',
  codename:'Legacy Mobile Services Cleanup',
  timezone:'Europe/Istanbul',
  locale:'tr-TR',
  cacheVersion:'v382-mobile-services-20260907-1',
  origin:Object.freeze({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36})
});
globalThis.RADIO_APP_CONFIG=config;
if(typeof document!=='undefined'){
  document.documentElement.dataset.appVersion=config.version;
  document.title=`Radyo Günlüğüm ${config.displayVersion}`;
}
})();