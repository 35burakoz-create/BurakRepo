(()=>{
const R=window.R;if(!R)return;const $=R.$;
const VERSION='V3.3.1';
const KEY='radio-ui-state-v39';
const DRAFT_KEY='radio-log-draft-v39';
const VALID=new Set(['home','now','log','audio','analysis','map','calendar','qsl','guide','smart','atlas','ai']);
const FILTER_IDS=['search','filterBand','filterDate','filterStatus','guideBand','guideFreq','guideSearch','calendarMonth'];
const FORM_IDS=['logId','audioPath','date','time','band','frequency','station','language','country','contentType','program','location','latitude','longitude','signal','status','antennaDirection','antennaAngle','dialPosition','transcript','notes','qslStatus','qslContact','qslSentAt','qslReceivedAt','qslNotes'];
function safeJSON(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function readHash(){const h=decodeURIComponent(location.hash||'').replace(/^#/,'');const m=h.match(/^(?:tab=)?([a-z0-9-]+)$/i);return m&&VALID.has(m[1])?m[1]:null}
const stored=safeJSON(localStorage.getItem(KEY),{});
const state={tab:readHash()||stored.tab||'home',nowMode:['ALL','SW','MW','FM'].includes(stored.nowMode)?stored.nowMode:'ALL',filters:{...(stored.filters||{})},scroll:{...(stored.scroll||{})}};
let current=state.tab,userIntent=null,fromHistory=false,bootGuardUntil=Date.now()+3500,draftDirty=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function writeHash(tab,kind='replace'){const u=new URL(location.href);u.hash=`tab=${tab}`;const fn=kind==='push'?'pushState':'replaceState';try{history[fn]({radioTab:tab},'',u)}catch{}}
function visibleTab(){const a=[...document.querySelectorAll('.tab-view')].filter(v=>!v.classList.contains('hidden'));return a.length===1?a[0].id.replace(/^tab-/,''):null}
function validTarget(t){return VALID.has(t)?t:'home'}
function exists(t){return !!document.querySelector(`#tab-${t}`)}
const baseSwitch=R.switch;
function applyNowMode(){if(current!=='now')return;R.nowMode=state.nowMode;setTimeout(()=>{const b=document.querySelector(`[data-v38mode="${state.nowMode}"]`)||document.querySelector(`[data-v34mode="${state.nowMode}"]`)||document.querySelector(`[data-v33mode="${state.nowMode}"]`);if(b&&!b.classList.contains('active'))b.click()},25)}
function restoreScroll(tab){const y=Number(state.scroll?.[tab]||0);setTimeout(()=>window.scrollTo({top:y,left:0,behavior:'auto'}),60)}
function switchCore(tab,{historyMode='replace',restorePosition=false}={}){
 tab=validTarget(tab);if(!exists(tab)&&!['home','now'].includes(tab))tab='home';
 if(current&&current!==tab)state.scroll[current]=window.scrollY||0;
 let out;try{out=baseSwitch?.(tab)}catch(e){console.error('Sekme geçişi hata verdi',e);if(tab!=='home'&&exists('home')){tab='home';try{out=baseSwitch?.('home')}catch{}}}
 current=tab;state.tab=tab;save();if(!fromHistory)writeHash(tab,historyMode);if(tab==='now')applyNowMode();if(restorePosition)restoreScroll(tab);return out
}
R.switch=(tab)=>{
 tab=validTarget(tab);
 if(Date.now()<bootGuardUntil&&tab==='home'&&state.tab!=='home'&&!userIntent)tab=state.tab;
 const historyMode=userIntent===tab?'push':'replace';userIntent=null;
 return switchCore(tab,{historyMode,restorePosition:false})
};
R.uiState=state;
R.restoreUiRoute=()=>switchCore(state.tab,{historyMode:'replace',restorePosition:true});

document.addEventListener('click',e=>{
 const go=e.target.closest('[data-v38go],[data-v33go],[data-v31go],[data-tab]');
 if(go){const t=go.dataset.v38go||go.dataset.v33go||go.dataset.v31go||go.dataset.tab;if(VALID.has(t))userIntent=t}
 const act=e.target.closest('[data-v38action]');if(act&&String(act.dataset.v38action||'').startsWith('go:')){const t=act.dataset.v38action.slice(3);if(VALID.has(t))userIntent=t}
 const m=e.target.closest('[data-v38mode],[data-v34mode],[data-v33mode]');if(m){const v=m.dataset.v38mode||m.dataset.v34mode||m.dataset.v33mode;if(['ALL','SW','MW','FM'].includes(v)){state.nowMode=v;R.nowMode=v;save()}}
},true);

function routeFromBrowser(){const t=readHash()||state.tab||'home';fromHistory=true;try{switchCore(t,{historyMode:'replace',restorePosition:true})}finally{fromHistory=false}}
window.addEventListener('popstate',routeFromBrowser);
window.addEventListener('hashchange',()=>{if(!fromHistory&&readHash()&&readHash()!==current)routeFromBrowser()});

function restoreFilters(){for(const id of FILTER_IDS){const el=document.getElementById(id);if(!el||state.filters[id]===undefined)continue;el.value=state.filters[id]}try{R.renderRecords?.();R.renderGuide?.();R.renderCalendar?.()}catch{} }
for(const id of FILTER_IDS){const el=document.getElementById(id);if(!el)continue;const remember=()=>{state.filters[id]=el.value;save()};el.addEventListener('input',remember);el.addEventListener('change',remember)}

function draftValues(){const values={};for(const id of FORM_IDS){const el=document.getElementById(id);if(el&&el.type!=='file')values[id]=el.value}return values}
function meaningful(v){return !!(v.logId||v.audioPath||v.frequency||v.station||v.language||v.country||v.program||v.transcript||v.notes||v.latitude||v.longitude||v.dialPosition)}
function saveDraft(){const values=draftValues();if(!draftDirty&&!meaningful(values))return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify({at:Date.now(),values}))}catch{}}
function clearDraft(){draftDirty=false;try{localStorage.removeItem(DRAFT_KEY)}catch{};$('#v39DraftBanner')?.remove()}
function restoreDraft(){const d=safeJSON(localStorage.getItem(DRAFT_KEY),null);if(!d?.values||Date.now()-Number(d.at||0)>7*86400000)return clearDraft();if(!meaningful(d.values))return clearDraft();for(const [id,v] of Object.entries(d.values)){const el=document.getElementById(id);if(el&&el.type!=='file')el.value=v??''}draftDirty=true;R.unit?.();if(state.tab==='log')$('#tab-log')?.classList.add('v38-form-open');const card=$('#tab-log .form-card');if(card&&!$('#v39DraftBanner')){const b=document.createElement('div');b.id='v39DraftBanner';b.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#eef2ff;color:#3730a3;font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center';b.innerHTML='<span>Kaydedilmemiş taslak geri yüklendi.</span><button type="button" class="btn ghost" style="padding:6px 9px">Taslağı sil</button>';b.querySelector('button').onclick=()=>{clearDraft();R.reset?.()};card.prepend(b)}}
const form=$('#logForm');if(form){form.addEventListener('input',()=>{draftDirty=true});form.addEventListener('change',()=>{draftDirty=true})}
window.addEventListener('pagehide',saveDraft);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft()});
const baseReset=R.reset;R.reset=()=>{clearDraft();return baseReset?.()};

function enforceRoute(){if(!R.me||$('#appView')?.classList.contains('hidden'))return;const desired=validTarget(state.tab);if(!exists(desired)&&!['home','now'].includes(desired)){state.tab='home';save();return switchCore('home',{historyMode:'replace'})}const v=visibleTab();if(v!==desired)switchCore(desired,{historyMode:'replace',restorePosition:false});else{current=desired;writeHash(desired,'replace');if(desired==='now')applyNowMode()}}
const baseLoad=R.load;R.load=async()=>{const out=await baseLoad();restoreFilters();setTimeout(enforceRoute,0);return out};
const baseShow=R.show;R.show=u=>{const out=baseShow?.(u);if(u)setTimeout(()=>{restoreFilters();restoreDraft();enforceRoute()},80);else{current='home'}return out};

function bootRestore(){const desired=readHash()||state.tab||'home';state.tab=validTarget(desired);save();restoreFilters();restoreDraft();if(R.me&&!$('#appView')?.classList.contains('hidden'))switchCore(state.tab,{historyMode:'replace',restorePosition:true});else writeHash(state.tab,'replace')}
setTimeout(bootRestore,120);setTimeout(enforceRoute,900);setTimeout(()=>{bootGuardUntil=0;enforceRoute()},3800);
setInterval(()=>{if(R.me)enforceRoute()},15000);

document.title=`Radyo Günlüğüm ${VERSION}`;const ver=document.querySelector('.topbar h1 span');if(ver)ver.textContent=VERSION;
})();