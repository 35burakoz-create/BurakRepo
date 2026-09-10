(()=>{
const R=window.R;if(!R||R.__routerCore385)return;R.__routerCore385=true;const events=R.events,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KNOWN=new Set(['home','now','log','audio','analysis','map','calendar','qsl','guide','smart','atlas','ai','memory','propagation']);const hooks=new Map();
function visibleRoute(){const a=$$('.tab-view').filter(v=>!v.classList.contains('hidden'));return a.length===1?a[0].id.replace(/^tab-/,''):null}
function hashRoute(){const h=decodeURIComponent(location.hash||'').replace(/^#/,'').replace(/^tab=/,'');return KNOWN.has(h)?h:null}
function ensureTab(name){let tab=document.getElementById(`tab-${name}`);if(tab)return tab;tab=document.createElement('section');tab.id=`tab-${name}`;tab.className='tab-view hidden';const app=$('#appView'),log=$('#tab-log');app?.insertBefore(tab,log||app.firstChild);return tab}
function switchView(name){const tab=document.getElementById(`tab-${name}`);if(!tab)throw new Error(`Route view missing: ${name}`);$$('.main-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab-view').forEach(v=>v.classList.add('hidden'));tab.classList.remove('hidden');return name}
function updateDock(route){$$('#v38Dock [data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route))}
let current=hashRoute()||'home';
function defaultPrepare(route){if(!document.getElementById(`tab-${route}`))ensureTab(route)}
function defaultEnter(route){updateDock(route)}
const router={
 register(name,adapter={}){if(!name)return()=>{};KNOWN.add(name);hooks.set(name,adapter||{});return()=>hooks.delete(name)},
 has(name){return KNOWN.has(String(name))||!!document.getElementById(`tab-${String(name)}`)},
 current:()=>current,
 routes:()=>[...KNOWN],
 go(name,meta={}){let target=String(name||'home');if(typeof R.navigation?.guardTarget==='function'){try{target=R.navigation.guardTarget(target,meta)||target}catch(error){R.reportError?.(error,'navigation-guard',{silent:true})}}if(!router.has(target)){R.reportError?.(new Error(`Unknown route: ${target}`),'router',{silent:true});target='home'}const from=current,historyMode=meta.historyMode||R.__nextNavigationHistory||'replace';R.__nextNavigationHistory=null;const ctx={from,to:target,source:meta.source||'app',historyMode,restorePosition:!!meta.restorePosition};events?.emit?.('route:before',ctx);try{defaultPrepare(target);hooks.get(target)?.prepare?.(ctx);switchView(target);current=visibleRoute()||target;hooks.get(current)?.enter?.({...ctx,to:current});defaultEnter(current);const done={...ctx,to:current};events?.emit?.('route:changed',done);return current}catch(error){R.reportError?.(error,'router');events?.emit?.('route:error',{...ctx,error});if(target!=='home')try{defaultPrepare('home');hooks.get('home')?.prepare?.({...ctx,to:'home'});switchView('home');current='home';hooks.get('home')?.enter?.({...ctx,to:'home'});defaultEnter('home');events?.emit?.('route:changed',{from,to:'home',source:'router-fallback',historyMode:'replace',restorePosition:false})}catch(fallbackError){R.reportError?.(fallbackError,'router-fallback',{silent:true})}return current}},
 sync(){const next=hashRoute()||visibleRoute()||R.uiState?.tab||current;if(next!==current){const prev=current;current=next;updateDock(current);events?.emit?.('route:changed',{from:prev,to:current,source:'sync',historyMode:'none',restorePosition:false})}return current},
 switchView
};
R.router=router;R.switch=(name,meta={})=>router.go(name,{source:'R.switch',...meta});
router.register('home',{prepare:()=>ensureTab('home')});router.register('now',{prepare:()=>ensureTab('now')});router.register('propagation',{prepare:()=>ensureTab('propagation')});
$$('.main-tab').forEach(b=>b.onclick=null);document.addEventListener('click',e=>{const b=e.target.closest('.main-tab[data-tab]');if(!b)return;e.preventDefault();router.go(b.dataset.tab,{source:'main-tab',historyMode:'push'})},true);
R.features?.register?.('router',{ready:true,provider:'app-router-core'});events?.emit?.('router:ready',{provider:'app-router-core',current,routes:router.routes()});
})();