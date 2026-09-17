(()=>{
const R=window.R;if(!R||R.__brandingSurfaces20260917)return;R.__brandingSurfaces20260917=true;
const FALLBACKS={radio_dark:'assets/branding/r9012-dark.svg',radio_light:'assets/branding/r9012-light.svg'};
let frame=0,revision=0,bodyObserver=null,themeObserver=null;
function css(){if(document.querySelector('link[data-branding-surfaces-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='app-branding-surfaces.css';l.dataset.brandingSurfacesCss='1';document.head.appendChild(l)}
function patchFallbacks(){for(const def of R.brandingAssets?.definitions||[])if(FALLBACKS[def.key])def.fallback=FALLBACKS[def.key]}
function dark(){return document.body?.classList.contains('night-mode')||document.documentElement.classList.contains('night')||document.documentElement.classList.contains('night-mode')}
function assetKey(){return dark()?'radio_dark':'radio_light'}
function fallback(key=assetKey()){return FALLBACKS[key]||'icon.svg'}
function custom(key){return !!R.brandingAssets?.rowFor?.(key)}
function homeSlot(){const root=document.querySelector('#v38Home'),consoleEl=root?.querySelector('.v42-radio-console');if(!root||!consoleEl)return null;let slot=root.querySelector('[data-branding-surface="home"]');if(!slot){slot=document.createElement('figure');slot.className='app-radio-visual app-radio-visual-home';slot.dataset.brandingSurface='home';slot.innerHTML='<div class="app-radio-visual-media"><img alt="TECSUN R-9012 saha alıcısı"></div><figcaption><span>SAHA ALICISI</span><b>TECSUN R-9012</b><small>12 bant · FM · MW · SW1–SW10</small><em></em></figcaption>';consoleEl.parentNode.insertBefore(slot,consoleEl)}return slot}
function nowSlot(){const root=document.querySelector('#v38Now'),head=root?.querySelector('.radio-console-head');if(!root||!head)return null;let slot=root.querySelector('[data-branding-surface="now"]');if(!slot){slot=document.createElement('figure');slot.className='app-radio-visual app-radio-visual-now';slot.dataset.brandingSurface='now';slot.innerHTML='<div class="app-radio-visual-media"><img alt="TECSUN R-9012 saha alıcısı"></div><figcaption><span>TECSUN</span><b>R-9012</b><small>12 bantlı analog saha alıcısı</small><em></em></figcaption>';head.insertAdjacentElement('afterend',slot)}return slot}
async function source(key,rev){patchFallbacks();try{const url=await R.brandingAssets?.resolve?.(key);if(rev!==revision)return null;return url||fallback(key)}catch(error){R.reportError?.(error,'branding-surface-resolve',{silent:true});return fallback(key)}}
function applyMeta(slot,key){if(!slot)return;slot.dataset.assetKey=key;slot.dataset.theme=dark()?'dark':'light';const em=slot.querySelector('figcaption em');if(em)em.textContent=custom(key)?'Kişisel görsel':'Yerleşik görsel'}
async function decorate(){frame=0;const rev=++revision,key=assetKey(),home=homeSlot(),now=nowSlot();for(const slot of [home,now]){if(!slot)continue;applyMeta(slot,key);const img=slot.querySelector('img');if(img&&!img.getAttribute('src'))img.src=fallback(key)}const url=await source(key,rev);if(!url||rev!==revision)return;for(const slot of [home,now]){if(!slot?.isConnected)continue;applyMeta(slot,key);const img=slot.querySelector('img');if(img&&img.src!==new URL(url,location.href).href)img.src=url}}
function schedule(){if(frame)return;frame=requestAnimationFrame(()=>decorate())}
function relevantMutation(m){const t=m.target instanceof Element?m.target:null;if(t?.closest?.('#v38Home,#v38Now'))return true;for(const n of m.addedNodes||[])if(n instanceof Element&&(n.matches?.('#v38Home,#v38Now,.v42-radio-console,.radio-console-head')||n.querySelector?.('#v38Home,#v38Now,.v42-radio-console,.radio-console-head')))return true;return false}
function observe(){if(!bodyObserver&&document.body){bodyObserver=new MutationObserver(ms=>{if(ms.some(relevantMutation))schedule()});bodyObserver.observe(document.body,{childList:true,subtree:true})}if(!themeObserver){themeObserver=new MutationObserver(()=>schedule());themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});if(document.body)themeObserver.observe(document.body,{attributes:true,attributeFilter:['class']})}}
css();patchFallbacks();observe();schedule();
for(const event of ['branding:changed','auth:changed','route:changed','store:updated','guide:data-ready','radio-console:mw-ready'])R.events?.on?.(event,schedule);
window.addEventListener('app:uimode',schedule,{passive:true});
R.brandingSurfaces={decorate,schedule,assetKey,isDark:dark,fallbacks:FALLBACKS};
R.features?.register?.('branding-surfaces',{ready:true,provider:'app-branding-surfaces'});
})();
