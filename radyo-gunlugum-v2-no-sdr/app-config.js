(()=>{
const bands=Object.freeze({
  FM:Object.freeze({min:76,max:108,unit:'MHz'}),
  MW:Object.freeze({min:525,max:1610,unit:'kHz'}),
  SW1:Object.freeze({min:3900,max:4000,unit:'kHz'}),
  SW2:Object.freeze({min:4750,max:5060,unit:'kHz'}),
  SW3:Object.freeze({min:5950,max:6200,unit:'kHz'}),
  SW4:Object.freeze({min:7100,max:7300,unit:'kHz'}),
  SW5:Object.freeze({min:9500,max:9900,unit:'kHz'}),
  SW6:Object.freeze({min:11650,max:12050,unit:'kHz'}),
  SW7:Object.freeze({min:13600,max:13800,unit:'kHz'}),
  SW8:Object.freeze({min:15100,max:15600,unit:'kHz'}),
  SW9:Object.freeze({min:17550,max:17900,unit:'kHz'}),
  SW10:Object.freeze({min:21450,max:21850,unit:'kHz'})
});
const config=Object.freeze({
  version:'3.8.5',
  displayVersion:'V3.8.5',
  codename:'R-9012 Güvenilirlik ve A26 Düzeltmeleri',
  timezone:'Europe/Istanbul',
  locale:'tr-TR',
  cacheVersion:'v385-core-boundary-menu-visual-polish-20260910-5',
  origin:Object.freeze({name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}),
  receiver:Object.freeze({model:'TECSUN R-9012',bands})
});
globalThis.RADIO_APP_CONFIG=config;
if(typeof document!=='undefined'){
  document.documentElement.dataset.appVersion=config.version;
  document.title=`Radyo Günlüğüm ${config.displayVersion}`;
}
})();