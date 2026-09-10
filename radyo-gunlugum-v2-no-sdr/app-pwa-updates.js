(()=>{
const R=window.R;if(!R||R.__pwaUpdates379)return;R.__pwaUpdates379=true;if(!('serviceWorker'in navigator)){R.features?.register?.('pwa-updates',{ready:false,provider:'app-pwa-updates'});return}
let refreshing=false,seenController=navigator.serviceWorker.controller,checkTimer=null;
function css(){if(document.querySelector('link[data-pwa-update-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='app-pwa-updates.css';l.dataset.pwaUpdateCss='1';document.head.appendChild(l)}css();
function close() {document.querySelector('#appUpdateBanner')?.remove()}
function show(){if(document.querySelector('#appUpdateBanner'))return;const b=document.createElement('div');b.id='appUpdateBanner';b.className='app-update-banner';b.setAttribute('role','status');b.setAttribute('aria-live','polite');b.innerHTML='<div><b>Yeni sürüm hazır</b><span>Kaydettiğin işler güvende. Uygulamayı istediğin anda yenileyebilirsin.</span></div><div class="app-update-actions"><button class="app-update-later" type="button">Sonra</button><button class="app-update-now" type="button">Şimdi yenile</button></div>';document.body.appendChild(b);b.querySelector('.app-update-later').onclick=close;b.querySelector('.app-update-now').onclick=()=>{if(refreshing)return;refreshing=true;close();location.reload()};R.events?.emit?.('pwa:update-ready')}
async function check(){if(!navigator.onLine)return;try{const reg=await navigator.serviceWorker.ready;await reg.update()}catch(error){R.reportError?.(error,'pwa-update-check',{silent:true})}}
navigator.serviceWorker.addEventListener('controllerchange',()=>{const next=navigator.serviceWorker.controller;if(!seenController){seenController=next;return}if(next&&next!==seenController){seenController=next;show()}});
window.addEventListener('load',()=>setTimeout(check,800));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});checkTimer=setInterval(()=>{if(document.visibilityState==='visible')check()},15*60*1000);
R.pwaUpdates={check,show,close,stop(){if(checkTimer)clearInterval(checkTimer);checkTimer=null}};R.features?.register?.('pwa-updates',{ready:true,provider:'app-pwa-updates'});
})();
