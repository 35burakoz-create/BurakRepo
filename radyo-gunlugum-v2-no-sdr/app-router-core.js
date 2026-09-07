(()=>{
const R=window.R;if(!R||R.__routerCore374)return;R.__routerCore374=true;
const events=R.events;const $=s=>document.querySelector(s);
const KNOWN=new Set(['home','now','log','audio','analysis','map','calendar','qsl','guide','smart','atlas','ai','memory','propagation']);
const hooks=new Map();
function visibleRoute(){const a=[...document.querySelectorAll('.tab-view')].filter(v=>!v.classList.contains('hidden'));return a.length===1?a[0].id.replace(/^tab-/,''):null}
function hashRoute(){const h=decodeURIComponent(location.hash||'').replace(/^#/,'').replace(/^tab=/,'');return KNOWN.has(h)?h:null}
function ensureTab(name){let tab=document.getElementById(`tab-${name}`);if(tab)return tab;tab=document.createElement('section');tab.id=`tab-${name}`;tab.className='tab-view hidden';const app=$('#appView'),log=$('#tab-log');app?.insertBefore(tab,log||app.firstChild);return tab}
function updateDock(route){document.querySelectorAll('#v38Dock [data-v38go]').forEach(b=>b.classList.toggle('active',b.dataset.v38go===route))}
function refreshFocus(route){try{R.renderAll?.()}catch(error){R.reportError?.(error,'router-focus-refresh',{silent:true})}if(route==='home')setTimeout(()=>R.events?.emit?.('view:home',{route}),0);if(route==='now')setTimeout(()=>R.events?.emit?.('view:now',{route}),0)}
let current=hashRoute()||R.uiState?.tab||visibleRoute()||'home';
function defaultPrepare(route){if(route==='home'||route==='now')ensureTab(route);if(route==='propagation'){try{R.renderPropagation?.(false)}catch(error){R.reportError?.(error,'propagation-prepare',{silent:true})}ensureTab('propagation')}}
function defaultEnter(route){updateDock(route);if(route==='home'||route==='now'||route==='log')refreshFocus(route);if(route==='propagation')setTimeout(()=>R.renderPropagation?.(false),0)}
const router={
 register(name,adapter={}){if(!name)return()=>{};KNOWN.add(name);hooks.set(name,adapter||{});return()=>hooks.delete(name)},
 has(name){return KNOWN.has(String(name))||!!document.getElementById(`tab-${String(name)}`)},
 current:()=>current,
 routes:()=>[...KNOWN],
 go(name,meta={}){
   let target=String(name||'home');
   if(typeof R.navigation?.guardTarget==='function'){try{target=R.navigation.guardTarget(target,meta)||target}catch(error){R.reportError?.(error,'navigation-guard',{silent:true})}}
   if(!router.has(target)){R.reportError?.(new Error(`Unknown route: ${target}`),'router',{silent:true});target='home'}
   const from=current,historyMode=meta.historyMode||R.__nextNavigationHistory||'replace';R.__nextNavigationHistory=null;
   const ctx={from,to:target,source:meta.source||'app',historyMode,restorePosition:!!meta.restorePosition};
   events?.emit?.('route:before',ctx);
   try{
     defaultPrepare(target);hooks.get(target)?.prepare?.(ctx);
     const base=R.coreSwitch;
     if(typeof base!=='function')throw new Error('Pristine core switch is unavailable');
     base(target);
     current=visibleRoute()||target;
     hooks.get(current)?.enter?.({...ctx,to:current});defaultEnter(current);
     const done={...ctx,to:current};events?.emit?.('route:changed',done);return current;
   }catch(error){
     R.reportError?.(error,'router');events?.emit?.('route:error',{...ctx,error});
     if(target!=='home')try{defaultPrepare('home');R.coreSwitch?.('home');current='home';defaultEnter('home');events?.emit?.('route:changed',{from,to:'home',source:'router-fallback',historyMode:'replace',restorePosition:false})}catch(fallbackError){R.reportError?.(fallbackError,'router-fallback',{silent:true})}
     return current;
   }
 },
 sync(){const next=hashRoute()||visibleRoute()||R.uiState?.tab||current;if(next!==current){const prev=current;current=next;updateDock(current);events?.emit?.('route:changed',{from:prev,to:current,source:'sync',historyMode:'none',restorePosition:false})}return current}
};
R.router=router;R.switch=(name,meta={})=>router.go(name,{source:'R.switch',...meta});
// Route-specific feature adapters can register after this file loads.
router.register('home',{prepare:()=>ensureTab('home')});
router.register('now',{prepare:()=>ensureTab('now')});
router.register('propagation',{prepare:()=>{try{R.renderPropagation?.(false)}catch{};ensureTab('propagation')},enter:()=>setTimeout(()=>R.renderPropagation?.(false),0)});
// Emit auth state changes without relying on legacy navigation wrappers.
const priorShow=R.show;if(typeof priorShow==='function')R.show=u=>{const out=priorShow(u);events?.emit?.('auth:changed',{user:R.me,authenticated:!!R.me});return out};
events?.on?.('store:updated',()=>{if(['home','now'].includes(current))refreshFocus(current)});
R.features?.register?.('router',{ready:true,provider:'app-router-core'});
events?.emit?.('router:ready',{provider:'app-router-core',current,routes:router.routes()});
})();
