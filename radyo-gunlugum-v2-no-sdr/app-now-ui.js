(()=>{
const R=window.R;if(!R||R.__nowUI385)return;R.__nowUI385=true;
const $=s=>document.querySelector(s),C=globalThis.RADIO_APP_CONFIG||{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir'}},TZ=C.timezone||'Europe/Istanbul',esc=v=>R.esc?R.esc(v):String(v??'');
const fallbackLabelFmt=new Intl.DateTimeFormat('tr-TR',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const MODES=new Set(['ALL','SW','MW','FM']);let visibleLimit=30,minuteTimer=null,renderTimer=null;
function ensureTab(){let t=$('#tab-now');if(!t){t=document.createElement('section');t.id='tab-now';t.className='tab-view hidden';const app=$('#appView'),log=$('#tab-log');app?.insertBefore(t,log||app.firstChild)}return t}
function ensure(){const t=ensureTab();let x=$('#v38Now');if(!x){x=document.createElement('div');x.id='v38Now';x.className='v38-now';t.appendChild(x)}return x}
function mode(){const v=R.uiState?.nowMode||R.nowMode||'ALL';return MODES.has(v)?v:'ALL'}
function labelNow(){try{const value=R.clock?.format?.(new Date(),{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});if(value)return value}catch{}return fallbackLabelFmt.format(new Date())}
function originName(){return R.listeningOrigin?.()?.name||C.origin?.name||'Bozköy, Torbalı, İzmir'}
function band(e){return e?.mode==='SW'?(e.band||'SW'):(e?.mode||e?.band||'')}
function unit(e){return e?.unit||((e?.mode||e?.band)==='FM'?'MHz':'kHz')}
function validCandidate(e){const f=Number(e?.frequency),id=e?.id;if(!e||id===null||id===undefined||String(id).trim()===''||!Number.isFinite(f)||f<=0)return false;if(R.currentPrograms?.receiverCompatible?.(e)===false)return false;return true}
function freq(e){const n=Number(e?.frequency);return `${Number.isFinite(n)&&n>0?n.toLocaleString('tr-TR',{maximumFractionDigits:3}):'—'} ${unit(e)}`}
function lang(e){return String(e?.language_content||e?.language||'').split(/[;/,]/)[0].trim()}
function score(e){const raw=e?._score??e?._s?.score??e?.probability_score;if(raw===null||raw===undefined||raw==='')return null;const n=Number(raw);return Number.isFinite(n)?Math.max(1,Math.min(99,Math.round(n))):null}
function quality(n){return !Number.isFinite(n)?'Puan yok':n>=80?'Çok iyi':n>=65?'İyi':n>=50?'Orta':'Zayıf'}
function candidates(m=mode()){
  if(typeof R.radioNowCandidates==='function'){
    try{const rows=R.radioNowCandidates(m);return(Array.isArray(rows)?rows:[]).filter(validCandidate)}catch(error){R.reportError?.(error,'now-candidates',{silent:true});return[]}
  }
  try{const rows=R.currentSuggestions?.()||[];return(m==='ALL'?rows:rows.filter(x=>x.mode===m)).filter(validCandidate)}catch(error){R.reportError?.(error,'now-candidates-fallback',{silent:true});return[]}
}
function windowText(e){return R.guideService?.currentWindowText?.(e,R.clock?.today?.(),R.clock?.time?.())||e?.time_text||''}
function guideReady(){return Array.isArray(R.guideEntries)&&R.guideEntries.length>0}
function spectrumSummary(all,filteredCount){const sw=all.filter(x=>x.mode==='SW').length,mw=all.filter(x=>x.mode==='MW').length,fm=all.filter(x=>x.mode==='FM').length;return `<div class="v42-now-summary" aria-label="Şu an uygun yayın özeti"><div class="active"><small>UYGUN</small><b>${filteredCount.toLocaleString('tr-TR')}</b><span>bu filtrede</span></div><div><small>SW</small><b>${sw.toLocaleString('tr-TR')}</b><span>kısa dalga</span></div><div><small>MW</small><b>${mw.toLocaleString('tr-TR')}</b><span>orta dalga</span></div><div><small>FM</small><b>${fm.toLocaleString('tr-TR')}</b><span>yerel FM</span></div></div>`}
function cleanSource(value){return String(value||'').replace(/[\u0000-\u001f\u007f-\u009f]+/g,' ').replace(/\s+/g,' ').trim()}
function item(e){
  const s=score(e),time=windowText(e),q=s===null?'unknown':s>=80?'great':s>=65?'good':s>=50?'mid':'low';
  const scoreHtml=s===null?'<span class="v38-score" data-score-unknown aria-label="Puan bilgisi yok">—<span class="v42-quality-label">Puan yok</span></span>':`<span class="v38-score" aria-label="${s} / 99 puan, ${esc(quality(s))}">${s}/99<span class="v42-quality-label">${esc(quality(s))}</span></span>`;
  const detail=[];if(e.country)detail.push(`Ülke: <b>${esc(e.country)}</b>`);if(e.content_hint)detail.push(`İçerik: <b>${esc(e.content_hint)}</b>`);const source=cleanSource(e.source_doc);if(source)detail.push(`Kaynak: ${esc(source)}`);if(time)detail.push(`Yayın saati: ${esc(time)}`);
  const details=detail.length?`<details><summary>Ayrıntıları göster</summary><div class="v38-detail">${detail.join('<br>')}</div></details>`:'';
  return `<article class="v38-item" data-quality="${q}"><div class="v38-itemtop"><div><div class="freq">${freq(e)}</div><div class="station">${esc(e.station||'Yayın adayı')}</div><div class="meta">${esc([band(e),lang(e)||e.country,time].filter(Boolean).join(' · '))}</div></div>${scoreHtml}</div><div class="v38-itemactions"><button type="button" class="btn primary" data-listen="${esc(e.id)}">Dinle</button><button type="button" class="btn ghost" data-prefill="${esc(e.id)}">Kayıt formuna aktar</button></div>${details}</article>`
}
function emptyState(m){if(!guideReady())return '<div class="v38-empty v42-state" role="status"><b>Yayın rehberi hazırlanıyor</b><span>Veriler hazır olduğunda şu anda denenmeye değer yayınlar burada görünecek.</span></div>';const text=m==='ALL'?'Şu anda dinlemeye uygun bir yayın adayı yok.':`${m} bandında şu anda dinlemeye uygun bir yayın adayı yok.`;return `<div class="v38-empty v42-state" role="status">${esc(text)}</div>`}
function render(){const root=ensure(),m=mode(),full=candidates(m),a=full.slice(0,visibleLimit),all=m==='ALL'?full:candidates('ALL'),remaining=Math.max(0,full.length-a.length);R.nowMode=m;root.innerHTML=`<section class="v38-section"><div class="v38-nowhead"><div class="v38-nowtitle"><span class="v42-section-kicker">ŞU ANKİ YAYIN ADAYLARI</span><h2>Şu An</h2><p>${esc(originName())} · ${esc(labelNow())}</p></div><div class="row-actions"><button type="button" class="btn ghost" data-v44search>⌕ Ara</button><button type="button" class="btn ghost" data-route="guide">Rehber</button></div></div><div class="v38-filters" role="group" aria-label="Yayın bandı filtresi">${['ALL','SW','MW','FM'].map(x=>`<button type="button" class="${m===x?'active':''}" data-now-mode="${x}" aria-pressed="${m===x?'true':'false'}">${x==='ALL'?'Tümü':x}</button>`).join('')}</div>${spectrumSummary(all,full.length)}<div class="v38-list">${a.length?a.map(item).join(''):emptyState(m)}${remaining?`<button type="button" class="btn ghost" data-now-more>${remaining.toLocaleString('tr-TR')} adayı daha göster</button>`:''}</div></section>`;return root}
function stopMinuteRefresh(){if(minuteTimer!==null){clearTimeout(minuteTimer);minuteTimer=null}}
function scheduleMinuteRefresh(){stopMinuteRefresh();if(R.router?.current?.()!=='now'||document.hidden)return;const delay=Math.max(250,60000-(Date.now()%60000)+75);minuteTimer=setTimeout(()=>{minuteTimer=null;if(R.router?.current?.()==='now'&&!document.hidden){render();scheduleMinuteRefresh()}},delay)}
function scheduleRender(delay=0,{resetLimit=false}={}){if(R.router?.current?.()!=='now')return;if(resetLimit)visibleLimit=30;if(renderTimer!==null)clearTimeout(renderTimer);renderTimer=setTimeout(()=>{renderTimer=null;if(R.router?.current?.()==='now')render()},delay)}
function enter(){render();scheduleMinuteRefresh()}
document.addEventListener('click',e=>{if(!(e.target instanceof Element))return;const more=e.target.closest('[data-now-more]');if(more){visibleLimit+=30;render();return}const b=e.target.closest('[data-now-mode]');if(!b)return;const v=b.dataset.nowMode;if(!MODES.has(v))return;visibleLimit=30;R.nowMode=v;if(R.uiState)R.uiState.nowMode=v;render()},true);
R.events?.on?.('store:updated',()=>scheduleRender());R.events?.on?.('guide:data-ready',()=>scheduleRender());R.events?.on?.('user:settings',()=>scheduleRender(0,{resetLimit:true}));R.events?.on?.('auth:changed',()=>scheduleRender(0,{resetLimit:true}));R.events?.on?.('route:changed',x=>{if(x?.to==='now')scheduleMinuteRefresh();else if(x?.from==='now')stopMinuteRefresh()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMinuteRefresh();else if(R.router?.current?.()==='now'){render();scheduleMinuteRefresh()}});
R.nowUI={render,ensure,mode,windowText,candidates,score,quality,validCandidate,guideReady,emptyState,scheduleMinuteRefresh,stopMinuteRefresh,get visibleLimit(){return visibleLimit}};R.router?.register?.('now',{prepare:ensure,enter});R.features?.register?.('now-ui',{ready:true,provider:'app-now-ui'});ensure();
})();