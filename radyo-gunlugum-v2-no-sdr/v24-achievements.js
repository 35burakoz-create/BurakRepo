(()=>{
const R=window.R;if(!R)return;const $=R.$;
R.achievements=[];
document.title='Radyo Günlüğüm V2.4';
const ver=document.querySelector('.topbar h1 span');if(ver)ver.textContent='V2.4';
const sub=document.querySelector('.topbar .sub');if(sub)sub.textContent='Koleksiyon & Başarılar — kişisel rozetler, ülke/dil koleksiyonu ve otomatik PWA güncellemesi.';

const css=`
.v24-ach-card{margin-top:12px}.v24-ach-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.v24-ach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.v24-badge{border:1px solid var(--v22-line,var(--line));border-radius:17px;padding:11px;background:#fff;min-height:118px;position:relative;overflow:hidden}.v24-badge.locked{opacity:.52;filter:grayscale(.65)}.v24-badge .ico{font-size:28px}.v24-badge strong{display:block;margin-top:5px}.v24-badge small{display:block;color:var(--muted);margin-top:3px;line-height:1.3}.v24-badge .unlocked{position:absolute;right:7px;top:7px;background:#dceadd;color:#235032;border-radius:999px;padding:3px 6px;font-size:10px;font-weight:900}.v24-progress{height:8px;background:#e7ebe6;border-radius:999px;overflow:hidden;margin-top:7px}.v24-progress>div{height:100%;background:linear-gradient(90deg,#26583d,#6d916f)}.v24-modal-bg{position:fixed;inset:0;background:rgba(9,18,12,.45);backdrop-filter:blur(5px);z-index:3498}.v24-modal{position:fixed;z-index:3499;left:50%;top:50%;transform:translate(-50%,-50%);width:min(840px,calc(100% - 18px));max-height:88vh;overflow:auto;background:#fbfcf8;border:1px solid var(--v22-line,var(--line));border-radius:24px;padding:16px;box-shadow:0 30px 90px rgba(0,0,0,.3)}.v24-modal-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.v24-modal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}.v24-close{width:38px;height:38px;border-radius:50%;border:1px solid var(--v22-line,var(--line));background:#fff;font-size:20px}.v24-collection{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.v24-pill{border:1px solid var(--v22-line,var(--line));background:#f4f7f2;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:800}.night-mode .v24-badge,.night-mode .v24-modal,.night-mode .v24-close{background:#172019;color:#edf4ee}@media(max-width:760px){.v24-ach-grid{grid-template-columns:repeat(2,1fr)}.v24-modal-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:420px){.v24-modal-grid{grid-template-columns:1fr}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function norm(s=''){return R.norm?R.norm(s):String(s).toLowerCase()}
function splitValues(v){return String(v||'').split(/[/,;]/).map(x=>x.trim()).filter(Boolean)}
function uniqueValues(fn){return [...new Set(R.logs.flatMap(fn).map(x=>norm(x)).filter(Boolean))]}
function hourOf(x){return Number(String(x.time||'00:00').slice(0,2))}
function maxStreak(){const dates=[...new Set(R.logs.map(x=>x.date).filter(Boolean))].sort();if(!dates.length)return 0;let best=1,run=1;for(let i=1;i<dates.length;i++){const a=new Date(dates[i-1]+'T12:00:00'),b=new Date(dates[i]+'T12:00:00');if(Math.round((b-a)/86400000)===1){run++;best=Math.max(best,run)}else run=1}return best}
function stats(){const countries=uniqueValues(x=>splitValues(x.country)),langs=uniqueValues(x=>splitValues(x.language)),stations=uniqueValues(x=>[x.station]),bands=new Set(R.logs.map(x=>String(x.band||'')));return{logs:R.logs.length,countries:countries.length,languages:langs.length,stations:stations.length,maxStreak:maxStreak(),hasFM:bands.has('FM'),hasMW:bands.has('MW'),hasSW:[...bands].some(x=>x.startsWith('SW')),countryNames:countries,languageNames:langs}}

const DEF=[
['first_log','📻','İlk Sinyal','İlk dinleme kaydını oluştur.',s=>s.logs>=1],
['five_logs','🗒️','Saha Günlüğü','5 dinleme kaydına ulaş.',s=>s.logs>=5],
['ten_logs','📚','Arşivci','10 dinleme kaydına ulaş.',s=>s.logs>=10],
['twentyfive_logs','🗃️','Ciddi Arşiv','25 dinleme kaydına ulaş.',s=>s.logs>=25],
['first_confirmed','✅','Kimliği Belirlendi','Bir yayını doğrulanmış olarak kaydet.',()=>R.logs.some(x=>x.status==='confirmed')],
['signal_five','📶','5/5','İlk 5/5 sinyali yakala.',()=>R.logs.some(x=>Number(x.signal_strength)===5)],
['first_sw','🌐','Kısa Dalga Kaşifi','İlk SW kaydını oluştur.',s=>s.hasSW],
['first_mw','🌙','Gece Dalgası','İlk MW kaydını oluştur.',s=>s.hasMW],
['first_fm','🎵','Yerel Eter','İlk FM kaydını oluştur.',s=>s.hasFM],
['band_trinity','📡','Üç Bant','FM, MW ve SW bantlarının üçünü de kaydet.',s=>s.hasFM&&s.hasMW&&s.hasSW],
['three_languages','🗣️','Çok Dilli Eter','3 farklı dil kaydet.',s=>s.languages>=3],
['five_languages','🌍','Dil Avcısı','5 farklı dil kaydet.',s=>s.languages>=5],
['five_countries','🧭','Ülke Avcısı','5 farklı ülke kaydet.',s=>s.countries>=5],
['ten_countries','🗺️','Eter Atlası','10 farklı ülke kaydet.',s=>s.countries>=10],
['ten_stations','🏛️','İstasyon Koleksiyoncusu','10 farklı istasyon kaydet.',s=>s.stations>=10],
['first_audio','🎙️','Ses Kanıtı','Bir kayda ses örneği ekle.',()=>R.logs.some(x=>x.audio_path)],
['first_transcript','📝','Eterden Metne','Bir yayının transkriptini kaydet.',()=>R.logs.some(x=>String(x.transcript||'').trim())],
['first_qsl_sent','✉️','İlk QSL','İlk QSL raporunu gönder.',()=>R.logs.some(x=>['sent','received'].includes(x.qsl_status))],
['first_qsl_received','📬','Eterden Cevap','İlk QSL cevabını al.',()=>R.logs.some(x=>x.qsl_status==='received')],
['night_owl','🦉','Gece Kuşu','00:00–04:59 arasında bir yayın kaydet.',()=>R.logs.some(x=>hourOf(x)<5)],
['japanese','🇯🇵','Japonca Yayın','İlk Japonca yayını kaydet.',s=>s.languageNames.some(x=>x.includes('japon'))],
['streak_3','🔥','3 Günlük Seri','3 gün üst üste kayıt tut.',s=>s.maxStreak>=3],
['streak_7','🔥','Bir Haftalık Seri','7 gün üst üste kayıt tut.',s=>s.maxStreak>=7],
['streak_14','🏕️','Saha Alışkanlığı','14 gün üst üste kayıt tut.',s=>s.maxStreak>=14]
].map(([key,icon,title,desc,test])=>({key,icon,title,desc,test}));
R.achievementDefs=DEF;
function unlockedSet(){return new Set(R.achievements.map(x=>x.achievement_key))}
function defFor(k){return DEF.find(x=>x.key===k)}

async function syncAchievements(){if(!R.me)return;const s=stats(),old=unlockedSet(),earned=DEF.filter(d=>d.test(s)&&!old.has(d.key));if(earned.length){const rows=earned.map(d=>({user_id:R.me.id,achievement_key:d.key,metadata:{title:d.title}}));const z=await R.S.from('radio_achievements').insert(rows);if(!z.error){const q=await R.S.from('radio_achievements').select('*').eq('user_id',R.me.id).order('unlocked_at',{ascending:false});if(!q.error)R.achievements=q.data||[];if(R.toast)R.toast(earned.length===1?`🏆 Yeni rozet: ${earned[0].title}`:`🏆 ${earned.length} yeni rozet açıldı`)}}R.renderAchievements?.()}
async function loadAchievements(){if(!R.me)return;const q=await R.S.from('radio_achievements').select('*').eq('user_id',R.me.id).order('unlocked_at',{ascending:false});if(!q.error)R.achievements=q.data||[];await syncAchievements()}

function badgeHtml(d){const row=R.achievements.find(x=>x.achievement_key===d.key),open=!!row;return`<div class="v24-badge ${open?'':'locked'}"><span class=ico>${d.icon}</span>${open?'<span class=unlocked>✓ Açıldı</span>':''}<strong>${R.esc(d.title)}</strong><small>${R.esc(d.desc)}</small>${open?`<small>${new Date(row.unlocked_at).toLocaleDateString('tr-TR')}</small>`:''}</div>`}
function ensureSection(){const home=$('#tab-home .v23-home');if(!home||$('#v24Achievements'))return;const sec=document.createElement('section');sec.id='v24Achievements';sec.className='card v24-ach-card';sec.innerHTML=`<div class=v24-ach-head><div><h2 style="margin:0">🏆 Koleksiyon & Başarılar</h2><p class=hint>Radyo günlüğün büyüdükçe otomatik açılır.</p></div><button id=v24All class="btn ghost">Tüm rozetler</button></div><div id=v24Summary></div><div id=v24Preview class=v24-ach-grid></div><div id=v24Collections class=v24-collection></div>`;home.appendChild(sec);$('#v24All').onclick=openAll}
R.renderAchievements=()=>{ensureSection();const p=$('#v24Preview');if(!p)return;const open=unlockedSet(),earned=DEF.filter(x=>open.has(x.key)),next=DEF.filter(x=>!open.has(x.key));const show=[...earned.slice(0,4),...next.slice(0,Math.max(0,4-earned.slice(0,4).length))].slice(0,4);p.innerHTML=show.map(badgeHtml).join('');const n=earned.length,total=DEF.length;$('#v24Summary').innerHTML=`<div class=small><b>${n}/${total}</b> rozet açıldı</div><div class=v24-progress><div style="width:${Math.round(n/total*100)}%"></div></div>`;const s=stats();$('#v24Collections').innerHTML=`<span class=v24-pill>🌍 ${s.countries} ülke</span><span class=v24-pill>🗣️ ${s.languages} dil</span><span class=v24-pill>📻 ${s.stations} istasyon</span><span class=v24-pill>🔥 en uzun seri ${s.maxStreak} gün</span>`}
function closeAll(){document.querySelector('#v24ModalBg')?.remove();document.querySelector('#v24Modal')?.remove()}
function openAll(){closeAll();const bg=document.createElement('div');bg.id='v24ModalBg';bg.className='v24-modal-bg';bg.onclick=closeAll;const m=document.createElement('div');m.id='v24Modal';m.className='v24-modal';m.innerHTML=`<div class=v24-modal-head><div><h2 style="margin:0">🏆 Rozet Koleksiyonu</h2><p class=hint>${R.achievements.length}/${DEF.length} başarı açıldı.</p></div><button class=v24-close>×</button></div><div class=v24-modal-grid>${DEF.map(badgeHtml).join('')}</div>`;document.body.append(bg,m);m.querySelector('.v24-close').onclick=closeAll}

const oldLoad=R.load;R.load=async()=>{await oldLoad();await loadAchievements();R.renderAchievements()};
const oldAll=R.renderAll;R.renderAll=()=>{oldAll?.();R.renderAchievements?.();syncAchievements().catch(console.warn)};
const oldV23=R.renderV23;R.renderV23=()=>{oldV23?.();R.renderAchievements?.()};
setTimeout(()=>{ensureSection();if(R.me){loadAchievements().catch(console.warn)}},700);

// PWA update behavior: check on app open/foreground and reload when a newer worker takes control.
if('serviceWorker' in navigator){let reloading=false;const hadController=!!navigator.serviceWorker.controller;if(hadController){navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload()})}const check=()=>navigator.serviceWorker.ready.then(reg=>reg.update()).catch(()=>{});window.addEventListener('load',check);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)check()});setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)check()},15*60*1000)}
})();