(()=>{
const R=window.R;if(!R||R.__uiFinalPolish20260917)return;R.__uiFinalPolish20260917=true;
const ICONS=Object.freeze({
 home:'<path d="M3.5 10.5 12 3.5l8.5 7v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
 now:'<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
 log:'<path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM8 8h8M8 12h8M8 16h5"/>',
 propagation:'<path d="M4 14c2.5-4 5.5-6 8-6s5.5 2 8 6M7 17c1.7-2.3 3.4-3.5 5-3.5s3.3 1.2 5 3.5M12 20h.01"/>',
 memory:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H12v16H7.5A2.5 2.5 0 0 0 5 21.5zM19 5.5A2.5 2.5 0 0 0 16.5 3H12v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 menu:'<path d="M5 7h14M5 12h14M5 17h14"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'
});
function svg(name){const body=ICONS[name];return body?`<svg class="app-nav-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`:''}
function setIcon(el,name){if(!el||el.dataset.appIcon===name)return false;const markup=svg(name);if(!markup)return false;el.innerHTML=markup;el.dataset.appIcon=name;return true}
function syncIcons(){let changed=0;const pairs=[
 ['#v38Dock [data-route="home"] i,#appDesktopNav [data-route="home"] i','home'],
 ['#v38Dock [data-route="now"] i,#appDesktopNav [data-route="now"] i','now'],
 ['#v38Dock [data-route="log"] i,#appDesktopNav [data-route="log"] i','log'],
 ['#appDesktopNav [data-route="propagation"] i','propagation'],
 ['#appDesktopNav [data-route="memory"] i','memory'],
 ['#v38Dock [data-quick] i,#appDesktopNav [data-quick] i','plus'],
 ['#v38Dock [data-menu] i,#appDesktopNav [data-menu] i','menu'],
 ['.v42-top-search>span','search']
 ];
 for(const[selector,name]of pairs)for(const el of document.querySelectorAll(selector))changed+=setIcon(el,name)?1:0;
 return changed
}
let timer=0;
function schedule(){clearTimeout(timer);timer=setTimeout(syncIcons,0)}
for(const event of ['route:changed','auth:changed','render:all','data:loaded'])R.events?.on?.(event,schedule);
window.addEventListener('app:uimode',schedule);
let observer=null;
function observe(){if(observer||typeof MutationObserver==='undefined'||!document.body)return;observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length))schedule()});observer.observe(document.body,{childList:true,subtree:true})}
R.uiFinalPolish={icons:ICONS,svg,setIcon,syncIcons,schedule};
R.features?.register?.('ui-final-polish',{ready:true,provider:'app-ui-final-polish'});
setTimeout(()=>{syncIcons();observe()},0);
})();
