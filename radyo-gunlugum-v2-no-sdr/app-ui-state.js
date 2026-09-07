(()=>{
const R=window.R;if(!R||R.__uiState374)return;R.__uiState374=true;
const $=s=>document.querySelector(s);
const KEY='radio-ui-state-v39',DRAFT_KEY='radio-log-draft-v39';
const VALID=new Set(['home','now','log','audio','analysis','map','calendar','qsl','guide','smart','atlas','ai','memory','propagation']);
const FILTER_IDS=['search','filterBand','filterDate','filterStatus','guideBand','guideFreq','guideSearch','calendarMonth'];
const FORM_IDS=['logId','audioPath','date','time','band','frequency','station','language','country','contentType','program','location','latitude','longitude','signal','status','antennaDirection','antennaAngle','dialPosition','transcript','notes','qslStatus','qslContact','qslSentAt','qslReceivedAt','qslNotes'];
function json(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function readHash(){const h=decodeURIComponent(location.hash||'').replace(/^#/,'').replace(/^tab=/,'');return VALID.has(h)?h:null}
const old=json(localStorage.getItem(KEY),{});
const state={tab:readHash()||old.tab||'home',nowMode:['ALL','SW','MW','FM'].includes(old.nowMode)?old.nowMode:'ALL',filters:{...(old.filters||{})},scroll:{...(old.scroll||{})}};
let draftDirty=false,bootGuardUntil=Date.now()+3800,browserRouting=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function writeHash(tab,mode='replace'){if(mode==='none')return;const u=new URL(location.href);u.hash=`tab=${tab}`;try{history[mode==='push'?'pushState':'replaceState']({radioTab:tab},'',u)}catch{}}
function restoreScroll(tab){const y=Number(state.scroll?.[tab]||0);setTimeout(()=>window.scrollTo({top:y,left:0,behavior:'auto'}),70)}
function applyNowMode(){R.nowMode=state.nowMode;setTimeout(()=>{const b=document.querySelector(`[data-now-mode="${state.nowMode}"]`)||document.querySelector(`[data-v38mode="${state.nowMode}"]`)||document.querySelector(`[data-v34mode="${state.nowMode}"]`)||document.querySelector(`[data-v33mode="${state.nowMode}"]`);if(b&&!b.classList.contains('active'))b.click()},40)}
R.uiState=state;
R.navigation={
 state,
 guardTarget(target,meta={}){const explicit=R.__nextNavigationHistory==='push'||meta.historyMode==='push';if(target==='home'&&Date.now()<bootGuardUntil&&state.tab!=='home'&&!explicit&&meta.source==='R.switch')return state.tab;return VALID.has(target)?target:'home'},
 restore(){if(!R.me||$('#appView')?.classList.contains('hidden'))return;const target=VALID.has(readHash())?readHash():VALID.has(state.tab)?state.tab:'home';R.router?.go?.(target,{source:'restore',historyMode:'replace',restorePosition:true})}
};
document.addEventListener('click',e=>{const go=e.target.closest('[data-route],[data-v38go],[data-v42go],[data-tab]');const act=e.target.closest('[data-v38action]');const route=go?.dataset.route||go?.dataset.v38go||go?.dataset.v42go||go?.dataset.tab||(String(act?.dataset.v38action||'').startsWith('go:')?act.dataset.v38action.slice(3):'');if(VALID.has(route))R.__nextNavigationHistory='push';const m=e.target.closest('[data-now-mode],[data-v38mode],[data-v34mode],[data-v33mode]');if(m){const v=m.dataset.nowMode||m.dataset.v38mode||m.dataset.v34mode||m.dataset.v33mode;if(['ALL','SW','MW','FM'].includes(v)){state.nowMode=v;R.nowMode=v;save()}}},true);
R.events?.on?.('route:before',ctx=>{if(ctx?.from&&ctx.from!==ctx.to)state.scroll[ctx.from]=window.scrollY||0});
R.events?.on?.('route:changed',ctx=>{if(!ctx?.to||!VALID.has(ctx.to))return;state.tab=ctx.to;save();if(!browserRouting)writeHash(ctx.to,ctx.historyMode||'replace');if(ctx.to==='now')applyNowMode();if(ctx.restorePosition)restoreScroll(ctx.to)});
function browserRoute(){const target=readHash();if(!target||!R.me)return;browserRouting=true;try{R.router?.go?.(target,{source:'browser',historyMode:'none',restorePosition:true})}finally{browserRouting=false}}
window.addEventListener('popstate',browserRoute);window.addEventListener('hashchange',()=>{if(readHash()&&readHash()!==R.router?.current?.())browserRoute()});
function restoreFilters(){for(const id of FILTER_IDS){const el=document.getElementById(id);if(el&&state.filters[id]!==undefined)el.value=state.filters[id]}try{R.renderRecords?.();R.renderGuide?.();R.renderCalendar?.()}catch(error){R.reportError?.(error,'ui-state-filters',{silent:true})}}
for(const id of FILTER_IDS){const el=document.getElementById(id);if(!el)continue;const remember=()=>{state.filters[id]=el.value;save()};el.addEventListener('input',remember);el.addEventListener('change',remember)}
function draftValues(){const values={};for(const id of FORM_IDS){const el=document.getElementById(id);if(el&&el.type!=='file')values[id]=el.value}return values}
function meaningful(v){return !!(v.logId||v.audioPath||v.frequency||v.station||v.language||v.country||v.program||v.transcript||v.notes||v.latitude||v.longitude||v.dialPosition)}
function clearDraft(){draftDirty=false;try{localStorage.removeItem(DRAFT_KEY)}catch{};$('#v39DraftBanner')?.remove()}
function saveDraft(){const values=draftValues();if(!draftDirty&&!meaningful(values))return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify({at:Date.now(),values}))}catch{}}
function restoreDraft(){const d=json(localStorage.getItem(DRAFT_KEY),null);if(!d?.values||Date.now()-Number(d.at||0)>7*86400000)return clearDraft();if(!meaningful(d.values))return clearDraft();for(const [id,v] of Object.entries(d.values)){const el=document.getElementById(id);if(el&&el.type!=='file')el.value=v??''}draftDirty=true;R.unit?.();if(state.tab==='log')$('#tab-log')?.classList.add('v38-form-open');const card=$('#tab-log .form-card');if(card&&!$('#v39DraftBanner')){const b=document.createElement('div');b.id='v39DraftBanner';b.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#eef2ff;color:#3730a3;font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center';b.innerHTML='<span>Kaydedilmemiş taslak geri yüklendi.</span><button type="button" class="btn ghost" style="padding:6px 9px">Taslağı sil</button>';b.querySelector('button').onclick=()=>{clearDraft();R.reset?.()};card.prepend(b)}}
const form=$('#logForm');if(form){form.addEventListener('input',()=>{draftDirty=true});form.addEventListener('change',()=>{draftDirty=true})}
window.addEventListener('pagehide',()=>{saveDraft();state.scroll[state.tab]=window.scrollY||0;save()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft()});
const priorReset=R.reset;if(typeof priorReset==='function')R.reset=()=>{clearDraft();return priorReset()};
R.events?.on?.('data:loaded',()=>{restoreFilters();if(R.router?.current?.()==='now')applyNowMode()});
R.events?.on?.('auth:changed',x=>{if(x?.authenticated)setTimeout(()=>{restoreFilters();restoreDraft();R.navigation.restore()},90)});
save();writeHash(state.tab,'replace');setTimeout(()=>{bootGuardUntil=0;if(R.me)R.navigation.restore()},3900);
R.features?.register?.('ui-state',{ready:true,provider:'app-ui-state'});
})();
