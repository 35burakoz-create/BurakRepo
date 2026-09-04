(()=>{
const R=window.R;if(!R)return;const $=R.$;
document.title='Radyo Günlüğüm V3.2.2';
const ver=document.querySelector('.topbar h1 span');if(ver)ver.textContent='V3.2.2';
const TZ='Europe/Istanbul';
let mode='ALL',loading=null;

const css=`
.v34-clockline{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:9px;color:#dbeafe;font-size:12px}.v34-live{display:inline-flex;align-items:center;gap:5px;background:rgba(34,197,94,.16);border:1px solid rgba(74,222,128,.26);color:#bbf7d0;padding:5px 8px;border-radius:999px;font-weight:850}.v34-live:before{content:'';width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.13)}.v34-meta2{display:grid;gap:4px;margin-top:8px;font-size:11px;color:#64748b;line-height:1.45}.v34-meta2 b{color:#334155}.v34-time{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}.v34-time span{display:inline-flex;padding:5px 7px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:800}.v34-time .on{background:#ecfdf5;color:#047857}.v34-note{padding:10px 12px;border-radius:14px;background:#eef2ff;color:#4338ca;font-size:11px;line-height:1.45;margin-bottom:10px}.night-mode .v34-meta2,.night-mode .v34-meta2 b{color:#cbd5e1}.night-mode .v34-time span{background:#1e293b;color:#cbd5e1}.night-mode .v34-time .on{background:#052e26;color:#a7f3d0}.night-mode .v34-note{background:#1e1b4b;color:#c7d2fe}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function norm(v=''){return R.norm?R.norm(v):String(v).toLowerCase()}
function esc(v){return R.esc?R.esc(v):String(v??'')}
function trNow(){const d=new Date(),fmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}),p=Object.fromEntries(fmt.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const wd={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[p.weekday];return{date:`${p.year}-${p.month}-${p.day}`,hour:+p.hour,minute:+p.minute,mins:+p.hour*60+(+p.minute),weekday:wd,label:new Intl.DateTimeFormat('tr-TR',{timeZone:TZ,weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)}}
function inRange(m,r){let[a,b]=r||[];a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b))return false;if(b===1440)return m>=a;if(a===b)return true;return a<b?m>=a&&m<b:m>=a||m<b}
function weekdayOK(e,n){const t=norm(e.time_text||'');if(t.includes('hafta ici'))return n.weekday>=1&&n.weekday<=5;if(t.includes('hafta sonu'))return n.weekday===0||n.weekday===6;if(t.includes('pazar'))return n.weekday===0;if(t.includes('cumartesi'))return n.weekday===6;return true}
function valid(e,n){return(!e.valid_from||n.date>=e.valid_from)&&(!e.valid_to||n.date<=e.valid_to)}
function activeRange(e,n){if(!weekdayOK(e,n)||!Array.isArray(e.time_ranges)||!e.time_ranges.length)return null;return e.time_ranges.find(r=>inRange(n.mins,r))||null}
function remaining(n,r){let end=Number(r?.[1]);if(!Number.isFinite(end))return null;if(end===1440)end=1440;let diff=end-n.mins;if(Number(r[0])>end&&n.mins>=Number(r[0]))diff=(1440-n.mins)+end;if(diff<0)diff+=1440;return diff}
function remainText(m){if(m==null)return'';if(m<=0)return'bitmek üzere';const h=Math.floor(m/60),x=m%60;return h?`${h} sa${x?` ${x} dk`:''} kaldı`:`${x} dk kaldı`}
function score(e){try{return Number(R.scoreEntry?.(e)?.score||e.probability_score||50)}catch{return Number(e.probability_score||50)}}
function frequency(e){const unit=e.unit||((e.mode||e.band)==='FM'?'MHz':'kHz');return`${Number(e.frequency).toLocaleString('tr-TR',{maximumFractionDigits:3})} ${unit}`}
function exactCandidates(which='ALL'){
 const n=trNow();
 return (R.guideEntries||[])
  .filter(e=>e.entry_type==='station_target'&&valid(e,n)&&(which==='ALL'||e.mode===which))
  .map(e=>({...e,_range:activeRange(e,n)})).filter(e=>e._range)
  .map(e=>({...e,_score:score(e)}))
  .sort((a,b)=>b._score-a._score||Number(a.frequency)-Number(b.frequency))
  .filter((x,i,a)=>a.findIndex(y=>y.mode===x.mode&&y.band===x.band&&Number(y.frequency)===Number(x.frequency)&&norm(y.station)===norm(x.station)&&norm(y.language_content)===norm(x.language_content))===i);
}
function contentLines(e){const lang=String(e.language_content||'').trim(),hint=String(e.content_hint||'').trim();if(!hint||norm(hint)===norm(lang))return lang?`<div><b>Yayın içeriği:</b> ${esc(lang)}</div>`:'';return`${lang?`<div><b>Dil:</b> ${esc(lang)}</div>`:''}<div><b>Yayın içeriği:</b> ${esc(hint)}</div>`}
function card(e){const n=trNow(),s=Math.max(1,Math.min(99,Math.round(e._score||50))),band=e.mode==='SW'?(e.band||'SW'):e.mode,rem=remainText(remaining(n,e._range));return`<article class=v33-card><span class=v33-band>${esc(band)}</span><div class=v33-freq>${frequency(e)}</div><div class=v33-station>${esc(e.station||'Aday yayın')}</div><div class=v34-meta2>${contentLines(e)}${e.country?`<div><b>Ülke:</b> ${esc(e.country)}</div>`:''}</div><div class=v34-time><span class=on>● Şimdi yayında</span><span>🕒 ${esc(e.time_text||'')}</span>${rem?`<span>${esc(rem)}</span>`:''}</div><div class=v33-score><span>${s}/99</span><span class=v33-bar><i style="width:${s}%"></i></span></div><button class="btn ghost" data-v33try="${e.id}">Bu yayını dene</button></article>`}
async function ensureData(){if((R.guideEntries||[]).length)return;if(loading)return loading;loading=(async()=>{try{const q=await R.S.from('guide_entries').select('*').eq('entry_type','station_target');if(!q.error)R.guideEntries=q.data||[]}finally{loading=null}})();return loading}
function updateHome(){const root=$('#v33Home');if(!root)return;const n=trNow(),a=exactCandidates('ALL').slice(0,3),section=root.querySelector('.v33-section');if(!section)return;section.innerHTML=`<div class=v33-head><div><h3>Şu an gerçekten yayında</h3><p>Türkiye saati ${String(n.hour).padStart(2,'0')}:${String(n.minute).padStart(2,'0')} • yalnızca aktif saat aralıkları</p></div><button class="btn ghost" data-v33go=now>Tümü</button></div><div class=v34-note>Başlamamış veya bitmiş yayınlar bu listede gösterilmez. Program adı kaynakta yoksa yalnızca doğrulanmış dil/içerik bilgisi gösterilir.</div><div class=v33-cards>${a.length?a.map(card).join(''):'<div class=v33-empty>Bu dakika için kaynakta doğrulanmış aktif yayın bulunamadı.</div>'}</div>`}
function updateNow(){const root=$('#v33Now');if(!root)return;const n=trNow(),a=exactCandidates(mode).slice(0,18);root.innerHTML=`<section class=v33-hero><div class=v33-kicker>Bozköy, Torbalı • Europe/Istanbul</div><h2>Şu an ne dinleyebilirim?</h2><div class=v34-clockline><span class=v34-live>CANLI</span><span>${esc(n.label)}</span></div><p style="margin-top:8px">Yalnızca şu dakika gerçekten aktif olan yayınlar gösteriliyor.</p></section><section class=v33-section><div class=v33-head><div><h3>Şu anda yayında olanlar</h3><p>Aktif saat + gün + A26 geçerliliği kesin filtrelenir.</p></div></div><div class=v33-filter>${['ALL','SW','MW','FM'].map(m=>`<button class="${mode===m?'active':''}" data-v34mode="${m}">${m==='ALL'?'Tümü':m}</button>`).join('')}</div><div class=v34-note style="margin-top:11px">Karttaki saat, rehberdeki gerçek yayın aralığıdır. Örneğin 19:00'da başlayan yayın 18:34'te artık listelenmez.</div><div class=v33-cards>${a.length?a.map(card).join(''):'<div class=v33-empty>Bu bantta şu anda saat bilgisi doğrulanmış aktif yayın yok.</div>'}</div></section>`}
async function refresh(){await ensureData();updateHome();updateNow()}

document.addEventListener('click',e=>{const b=e.target.closest('[data-v34mode]');if(b){mode=b.dataset.v34mode;updateNow()}});
const priorSwitch=R.switch;R.switch=t=>{priorSwitch(t);if(t==='home'||t==='now')setTimeout(()=>refresh(),0)};
const priorLoad=R.load;R.load=async()=>{await priorLoad();await refresh()};
setInterval(()=>{if(R.me)refresh()},30000);
setTimeout(()=>refresh(),700);
})();