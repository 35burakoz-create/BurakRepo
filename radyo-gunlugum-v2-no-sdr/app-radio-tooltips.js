(()=>{
const R=window.R;if(!R||R.__radioTooltips386)return;R.__radioTooltips386=true;
const TIP_ID='appRadioTermTooltip';let active=null,sticky=false,raf=0,refreshTimer=null;
const $=s=>document.querySelector(s),termTarget=node=>node?.closest?.('[data-radio-term-help]')||null;
function termFor(el){const key=el?.dataset?.radioTermHelp;return key?R.radioGlossary?.terms?.[key]||null:null}
function ensure(){let tip=$('#'+TIP_ID);if(tip)return tip;tip=document.createElement('div');tip.id=TIP_ID;tip.className='app-radio-term-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;tip.innerHTML='<b data-radio-tip-title></b><span data-radio-tip-note></span>';document.body.appendChild(tip);return tip}
function stripNative(el){if(!el)return;if(el.hasAttribute('title'))el.removeAttribute('title');delete el.dataset.radioHelpTitle}
function refresh(){for(const el of document.querySelectorAll('[data-radio-term-help]')){stripNative(el);if(!el.matches('button,a,input,select,textarea,summary,[tabindex]')){el.tabIndex=0;el.dataset.radioTooltipTabindex='1'}el.setAttribute('aria-haspopup','true')}}
function position(){if(!active?.isConnected)return hide();const tip=ensure();if(tip.hidden)return;const r=active.getBoundingClientRect(),tr=tip.getBoundingClientRect(),gap=9,pad=10;let left=r.left+r.width/2-tr.width/2;left=Math.max(pad,Math.min(left,window.innerWidth-tr.width-pad));let top=r.top-tr.height-gap,side='top';if(top<pad){top=r.bottom+gap;side='bottom'}if(top+tr.height>window.innerHeight-pad)top=Math.max(pad,window.innerHeight-tr.height-pad);tip.style.left=`${Math.round(left)}px`;tip.style.top=`${Math.round(top)}px`;tip.dataset.side=side;const anchor=Math.max(16,Math.min(tr.width-16,r.left+r.width/2-left));tip.style.setProperty('--app-tip-anchor',`${Math.round(anchor)}px`)}
function schedulePosition(){cancelAnimationFrame(raf);raf=requestAnimationFrame(position)}
function show(el,{pin=false}={}){const t=termFor(el);if(!t)return;stripNative(el);if(active&&active!==el)active.removeAttribute('aria-describedby');active=el;sticky=!!pin;const tip=ensure();tip.querySelector('[data-radio-tip-title]').textContent=t.label;tip.querySelector('[data-radio-tip-note]').textContent=t.note;tip.hidden=false;el.setAttribute('aria-describedby',TIP_ID);tip.dataset.pinned=sticky?'1':'0';schedulePosition()}
function hide({force=false}={}){if(sticky&&!force)return;if(active)active.removeAttribute('aria-describedby');active=null;sticky=false;const tip=$('#'+TIP_ID);if(tip){tip.hidden=true;delete tip.dataset.pinned}}
function toggle(el){if(active===el&&sticky){hide({force:true});return}show(el,{pin:true})}
function scheduleRefresh(delay=130){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refreshTimer=null;refresh()},delay)}
document.addEventListener('pointerover',e=>{const el=termTarget(e.target);if(!el||e.pointerType==='touch')return;show(el)},{passive:true});
document.addEventListener('pointerout',e=>{const el=termTarget(e.target);if(!el||sticky)return;const next=termTarget(e.relatedTarget);if(next===el)return;hide()},{passive:true});
document.addEventListener('focusin',e=>{const el=termTarget(e.target);if(el)show(el)});
document.addEventListener('focusout',e=>{const el=termTarget(e.target);if(!el||sticky)return;const next=termTarget(e.relatedTarget);if(next===el)return;hide()});
document.addEventListener('pointerup',e=>{if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;const el=termTarget(e.target);if(el)toggle(el)},{passive:true});
document.addEventListener('click',e=>{if(!sticky)return;const el=termTarget(e.target);if(el===active||e.target.closest?.('#'+TIP_ID))return;hide({force:true})});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)hide({force:true})});
window.addEventListener('resize',schedulePosition,{passive:true});window.addEventListener('scroll',schedulePosition,{passive:true,capture:true});
for(const name of ['route:changed','data:loaded','store:updated','guide:data-ready','listening:data','user:settings','bootstrap:ready'])R.events?.on?.(name,()=>scheduleRefresh());
R.events?.on?.('route:before',()=>hide({force:true}));setTimeout(refresh,260);
R.radioTooltips={refresh,show,hide,toggle,position,get active(){return active},get pinned(){return sticky}};R.features?.register?.('radio-tooltips',{ready:true,provider:'app-radio-tooltips'});
})();
