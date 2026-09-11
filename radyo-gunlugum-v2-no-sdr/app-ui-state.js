(()=>{
const R=window.R;if(!R||R.__uiState385)return;R.__uiState385=true;
const $=s=>document.querySelector(s);
const LEGACY_KEY='radio-ui-state-v39',STATE_KEY='radio-ui-state-v40',DRAFT_KEY='radio-log-draft-v39';
const VALID=new Set(['home','now','log','audio','analysis','map','calendar','qsl','guide','smart','atlas','ai','memory','propagation']);
const FILTER_IDS=['search','filterBand','filterDate','filterStatus','guideBand','guideFreq','guideSearch','calendarMonth'];
const FORM_IDS=['logId','audioPath','date','time','band','frequency','station','language','country','contentType','program','location','latitude','longitude','signal','status','antennaDirection','antennaAngle','dialPosition','transcript','notes','qslStatus','qslContact','qslSentAt','qslReceivedAt','qslNotes'];
function json(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function readHash(){const h=decodeURIComponent(location.hash||'').replace(/^#/,'').replace(/^tab=/,'');return VALID.has(h)?h:null}
const state={tab:readHash()||'home',nowMode:'ALL',filters:{},scroll:{}};
let draftDirty=false,browserRouting=false,suppressDraftClear=false;
function stateStorageKey(userId=R.me?.id){return userId?`${STATE_KEY}:${userId}`:null}
function applyStoredState(userId=R.me?.id){const key=stateStorageKey(userId),saved=json(key?localStorage.getItem(key):null,{}),hash=readHash();state.tab=hash||(VALID.has(saved.tab)?saved.tab:'home');state.nowMode=['ALL','SW','MW','FM'].includes(saved.nowMode)?saved.nowMode:'ALL';state.filters={...(saved.filters||{})};state.scroll={...(saved.scroll||{})};return state}
function save(userId=R.me?.id){const key=stateStorageKey(userId);if(!key)return false;try{localStorage.setItem(key,JSON.stringify(state));return true}catch{return false}}
function clearLegacyState(){try{localStorage.removeItem(LEGACY_KEY)}catch{}}
function writeHash(tab,mode='replace'){if(mode==='none')return;const u=new URL(location.href);u.hash=`tab=${tab}`;try{history[mode==='push'?'pushState':'replaceState']({radioTab:tab},'',u)}catch{}}
function restoreScroll(tab){const y=Number(state.scroll?.[tab]||0);setTimeout(()=>window.scrollTo({top:y,left:0,behavior:'auto'}),70)}
function applyNowMode(){R.nowMode=state.nowMode;setTimeout(()=>{const b=document.querySelector(`[data-now-mode="${state.nowMode}"]`)||document.querySelector(`[data-v38mode="${state.nowMode}"]`)||document.querySelector(`[data-v34mode="${state.nowMode}"]`)||document.querySelector(`[data-v33mode="${state.nowMode}"]`);if(b&&!b.classList.contains('active'))b.click()},40)}
R.uiState=state;
R.navigation={state,guardTarget(target){return VALID.has(target)?target:'home'},restore(){if(!R.me)return null;const target=readHash()||state.tab||'home';return R.router?.go?.(VALID.has(target)?target:'home',{source:'restore',historyMode:'replace',restorePosition:true})||null}};
document.addEventListener('click',e=>{const go=e.target.closest('[data-route],[data-v38go],[data-v42go],[data-tab]'),act=e.target.closest('[data-v38action]'),route=go?.dataset.route||go?.dataset.v38go||go?.dataset.v42go||go?.dataset.tab||(String(act?.dataset.v38action||'').startsWith('go:')?act.dataset.v38action.slice(3):'');if(VALID.has(route))R.__nextNavigationHistory='push';const m=e.target.closest('[data-now-mode],[data-v38mode],[data-v34mode],[data-v33mode]');if(m){const v=m.dataset.nowMode||m.dataset.v38mode||m.dataset.v34mode||m.dataset.v33mode;if(['ALL','SW','MW','FM'].includes(v)){state.nowMode=v;R.nowMode=v;save()}}},true);
R.events?.on?.('route:before',ctx=>{if(ctx?.from&&ctx.from!==ctx.to)state.scroll[ctx.from]=window.scrollY||0});
R.events?.on?.('route:changed',ctx=>{if(!ctx?.to||!VALID.has(ctx.to))return;state.tab=ctx.to;save();if(!browserRouting)writeHash(ctx.to,ctx.historyMode||'replace');if(ctx.to==='now')applyNowMode();if(ctx.restorePosition)restoreScroll(ctx.to)});
function browserRoute(){const target=readHash();if(!target||!R.me)return;browserRouting=true;try{R.router?.go?.(target,{source:'browser',historyMode:'none',restorePosition:true})}finally{browserRouting=false}}
window.addEventListener('popstate',browserRoute);window.addEventListener('hashchange',()=>{if(readHash()&&readHash()!==R.router?.current?.())browserRoute()});
function restoreFilters(){for(const id of FILTER_IDS){const el=document.getElementById(id);if(el)el.value=state.filters[id]!==undefined?state.filters[id]:''}}
function setFilter(id,value){if(!FILTER_IDS.includes(id))return false;state.filters[id]=String(value??'');const el=document.getElementById(id);if(el)el.value=state.filters[id];save();return true}
for(const id of FILTER_IDS){const el=document.getElementById(id);if(!el)continue;const remember=()=>{state.filters[id]=el.value;save()};el.addEventListener('input',remember);el.addEventListener('change',remember)}
function draftValues(){const values={};for(const id of FORM_IDS){const el=document.getElementById(id);if(el&&el.type!=='file')values[id]=el.value}return values}
function meaningful(v){return !!(v.logId||v.audioPath||v.frequency||v.station||v.language||v.country||v.program||v.transcript||v.notes||v.latitude||v.longitude||v.dialPosition)}
function draftStorageKey(userId=R.me?.id){return userId?`${DRAFT_KEY}:${userId}`:null}
function clearLegacyDraft(){try{localStorage.removeItem(DRAFT_KEY)}catch{}}
function clearDraft(){if(suppressDraftClear)return false;draftDirty=false;const key=draftStorageKey();try{if(key)localStorage.removeItem(key);localStorage.removeItem(DRAFT_KEY)}catch{};$('#v39DraftBanner')?.remove();return true}
function saveDraft(userId=R.me?.id){const key=draftStorageKey(userId);if(!key)return false;const values=draftValues();if(!draftDirty&&!meaningful(values))return false;try{localStorage.setItem(key,JSON.stringify({at:Date.now(),values}));return true}catch{return false}}
function restoreDraft(){const key=draftStorageKey();if(!key)return;const d=json(localStorage.getItem(key),null);if(!d?.values||Date.now()-Number(d.at||0)>7*86400000)return clearDraft();if(!meaningful(d.values))return clearDraft();for(const [id,v] of Object.entries(d.values)){const el=document.getElementById(id);if(el&&el.type!=='file')el.value=v??''}draftDirty=true;R.unit?.();if(state.tab==='log')$('#tab-log')?.classList.add('v38-form-open');const card=$('#tab-log .form-card');if(card&&!$('#v39DraftBanner')){const b=document.createElement('div');b.id='v39DraftBanner';b.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#eef2ff;color:#3730a3;font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center';b.innerHTML='<span>Kaydedilmemiş taslak geri yüklendi.</span><button type="button" class="btn ghost" style="padding:6px 9px">Taslağı sil</button>';b.querySelector('button').onclick=()=>{clearDraft();R.reset?.()};card.prepend(b)}}
function resetVisibleForm(){suppressDraftClear=true;try{R.reset?.()}finally{suppressDraftClear=false}$('#v39DraftBanner')?.remove()}
const form=$('#logForm');if(form){form.addEventListener('input',()=>{draftDirty=true});form.addEventListener('change',()=>{draftDirty=true})}
window.addEventListener('pagehide',()=>{saveDraft();state.scroll[state.tab]=window.scrollY||0;save()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft()});
R.events?.on?.('form:reset',clearDraft);
R.events?.on?.('data:loaded',()=>{restoreFilters();if(R.router?.current?.()==='now')applyNowMode()});
R.events?.on?.('auth:changed',x=>{const nextId=x?.user?.id||null,previousId=x?.previousUserId||null;if(previousId&&previousId!==nextId){saveDraft(previousId);save(previousId)}if(x?.authenticated){if(previousId&&previousId!==nextId)resetVisibleForm();applyStoredState(nextId);restoreFilters();restoreDraft();R.navigation.restore()}else{state.tab=readHash()||'home';state.nowMode='ALL';state.filters={};state.scroll={};setTimeout(resetVisibleForm,0)}});
R.events?.on?.('bootstrap:ready',()=>{if(R.me){applyStoredState(R.me.id);restoreFilters();R.navigation.restore()}});
clearLegacyState();clearLegacyDraft();if(R.me){applyStoredState(R.me.id);restoreFilters();restoreDraft();R.navigation.restore()}
R.uiStatePersistence={saveDraft,restoreDraft,clearDraft,draftStorageKey,stateStorageKey,applyStoredState,setFilter,save,resetVisibleForm};
R.features?.register?.('ui-state',{ready:true,provider:'app-ui-state'});
})();