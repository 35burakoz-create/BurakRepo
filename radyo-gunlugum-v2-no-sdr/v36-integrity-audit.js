(()=>{
const R=window.R;if(!R)return;const $=R.$;
const TZ='Europe/Istanbul';

// Compatibility sink for legacy modules that still expect the old V2.3 home container.
function ensureCompatHome(){
 let home=$('#tab-home');
 if(!home){
  home=document.createElement('section');home.id='tab-home';home.className='tab-view hidden';
  const app=$('#appView'),log=$('#tab-log');app?.insertBefore(home,log||app.firstChild);
 }
 if(!home.querySelector(':scope > .v23-home')){
  const sink=document.createElement('div');sink.className='v23-home';sink.setAttribute('aria-hidden','true');sink.style.display='none';home.appendChild(sink);
 }
}
ensureCompatHome();

function esc(v){return R.esc?R.esc(v):String(v??'')}
function norm(v=''){return R.norm?R.norm(v):String(v).toLowerCase()}
function toast(v){R.toast?R.toast(v):alert(v)}
function radioNow(){return R.radioTime?R.radioTime():(()=>{const d=new Date(),f=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),p=Object.fromEntries(f.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return{date:`${p.year}-${p.month}-${p.day}`,hour:+p.hour,minute:+p.minute,mins:+p.hour*60+(+p.minute)}})()}
function addDays(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function dayOf(date){return new Date(date+'T12:00:00Z').getUTCDay()}
function weekdayOK(e,date){const t=norm(e?.time_text||''),w=dayOf(date);if(t.includes('hafta ici'))return w>=1&&w<=5;if(t.includes('hafta sonu'))return w===0||w===6;if(t.includes('pazar'))return w===0;if(t.includes('cumartesi'))return w===6;return true}
function validAt(e,date){return(!e?.valid_from||date>=e.valid_from)&&(!e?.valid_to||date<=e.valid_to)}
function istDate(ts){if(!ts)return null;const d=new Date(ts);if(Number.isNaN(d.getTime()))return null;const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`}

// Correct achievement semantics without changing existing achievement keys.
function patchAchievements(){
 const defs=R.achievementDefs||[];
 const sw5=defs.find(x=>x.key==='signal_five');if(sw5){sw5.title='Kısa Dalga 5/5';sw5.desc='Bir kısa dalga yayınını 5/5 sinyalle kaydet.';sw5.test=()=>R.logs.some(x=>String(x.band||'').startsWith('SW')&&Number(x.signal_strength)===5)}
 const night=defs.find(x=>x.key==='night_owl');if(night){night.title='Gece MW';night.desc='00:00–04:59 arasında bir MW yayını kaydet.';night.test=()=>R.logs.some(x=>x.band==='MW'&&Number(String(x.time||'00:00').slice(0,2))<5)}
 const jp=defs.find(x=>x.key==='japanese');if(jp){jp.test=s=>(s.languageNames||[]).some(x=>x.includes('japon')||x.includes('japanese'))}
}
patchAchievements();

// Band-aware frequency validation and friendly SW MHz -> kHz normalization.
const FR={FM:[76,108],MW:[525,1610],SW1:[3900,4000],SW2:[4750,5060],SW3:[5950,6200],SW4:[7100,7300],SW5:[9500,9900],SW6:[11650,12050],SW7:[13600,13800],SW8:[15100,15600],SW9:[17550,17900],SW10:[21450,21850]};
function checkedFrequency(band,value){let f=Number(value);if(!Number.isFinite(f)||f<=0)return{ok:false,msg:'Geçerli bir frekans gir.'};if(String(band).startsWith('SW')&&f>=3&&f<30)f*=1000;const r=FR[band];if(r&&(f<r[0]||f>r[1]))return{ok:false,msg:`${band} için frekans ${r[0].toLocaleString('tr-TR')}–${r[1].toLocaleString('tr-TR')} ${band==='FM'?'MHz':'kHz'} aralığında olmalı.`};return{ok:true,value:f}}
const form=$('#logForm');if(form)form.addEventListener('submit',e=>{const b=$('#band')?.value,q=checkedFrequency(b,$('#frequency')?.value);if(!q.ok){e.preventDefault();e.stopImmediatePropagation();if($('#formMsg'))$('#formMsg').textContent=q.msg;return}$('#frequency').value=q.value},true);
document.addEventListener('click',e=>{const b=e.target.closest('#v35SaveQuick');if(!b)return;const q=checkedFrequency($('#v35Band')?.value,$('#v35Freq')?.value);if(!q.ok){e.preventDefault();e.stopImmediatePropagation();toast(q.msg);return}if($('#v35Freq'))$('#v35Freq').value=q.value},true);

// Preserve audio duration when a preview is available.
const baseBody=R.body;R.body=()=>{const b=baseBody();const d=Number($('#audioPreview')?.duration);if(Number.isFinite(d)&&d>0)b.audio_duration_seconds=Math.round(d);return b};

// Make loaded data single-flight to prevent duplicate auth/bootstrap refreshes.
const previousLoad=R.load;let loadFlight=null;R.v36Settings=null;
async function loadSettings(){if(!R.me)return;const q=await R.S.from('radio_user_settings').select('*').eq('user_id',R.me.id).maybeSingle();if(!q.error)R.v36Settings=q.data||{daily_goal:3,country_hunt_enabled:true,show_streak:true}}
async function cleanupStaleAI(){const now=Date.now(),stale=(R.v30Analyses||[]).filter(x=>x.status==='running'&&now-new Date(x.created_at).getTime()>15*60*1000);for(const x of stale){const q=await R.S.from('radio_ai_analyses').update({status:'error',error:'Analiz yarıda kaldı; yeniden analiz edebilirsin.'}).eq('id',x.id).eq('user_id',R.me.id);if(!q.error){x.status='error';x.error='Analiz yarıda kaldı; yeniden analiz edebilirsin.'}}}
R.load=()=>{if(loadFlight)return loadFlight;loadFlight=(async()=>{await previousLoad();await loadSettings().catch(()=>{});await cleanupStaleAI().catch(()=>{});applyHomePrefs();enhanceAudioRecovery();return true})().finally(()=>{loadFlight=null});return loadFlight};

// Make the legacy settings actually affect the simplified home screen.
function activeSettings(){return R.v23Settings||R.v36Settings||{daily_goal:3,country_hunt_enabled:true,show_streak:true}}
function currentStreak(){const set=new Set((R.logs||[]).map(x=>x.date).filter(Boolean));let n=0;const today=radioNow().date;for(let i=0;i<366;i++){const k=addDays(today,-i);if(set.has(k))n++;else if(i===0)continue;else break}return n}
function countryCount(){return new Set((R.logs||[]).flatMap(x=>String(x.country||'').split(/[/,;]/)).map(x=>norm(x.trim())).filter(Boolean)).size}
function applyHomePrefs(){const root=$('#v33Home'),stats=root?.querySelector('.v33-stats');if(!stats)return;const s=activeSettings(),cards=[...stats.children],today=(R.logs||[]).filter(x=>x.date===radioNow().date).length;if(cards[0]){cards[0].style.display='';const b=cards[0].querySelector('b'),sp=cards[0].querySelector('span');if(b)b.textContent=`${today}/${Math.max(1,Number(s.daily_goal)||3)}`;if(sp)sp.textContent='günlük hedef'}if(cards[1]){cards[1].style.display=s.country_hunt_enabled===false?'none':'';if(s.country_hunt_enabled!==false){cards[1].querySelector('b').textContent=countryCount();cards[1].querySelector('span').textContent='ülke'}}if(cards[2]){cards[2].style.display=s.show_streak===false?'none':'';if(s.show_streak!==false){cards[2].querySelector('b').textContent=currentStreak();cards[2].querySelector('span').textContent='gün seri'}}const visible=cards.filter(x=>x.style.display!=='none').length;stats.style.gridTemplateColumns=`repeat(${Math.max(1,visible)},1fr)`}
function observeHome(){const root=$('#v33Home');if(root&&!root.dataset.v36obs){root.dataset.v36obs='1';new MutationObserver(()=>setTimeout(applyHomePrefs,0)).observe(root,{childList:true,subtree:true})}applyHomePrefs()}
setInterval(observeHome,15000);setTimeout(observeHome,500);
document.addEventListener('click',e=>{if(e.target.closest('#v35SetSave'))setTimeout(()=>{if(R.v23Settings)R.v36Settings=R.v23Settings;applyHomePrefs()},800)},true);

// Listening sessions should always start from all current bands, not the last UI filter.
const priorSwitch=R.switch;R.switch=t=>{if(t==='smart')R.nowMode='ALL';const out=priorSwitch(t);if(t==='home')setTimeout(applyHomePrefs,0);return out};

// Correct Istanbul-time reminder scheduler. It refreshes DB state first so the older scheduler cannot duplicate a notification.
async function checkRemindersIstanbul(){if(!R.me||!('Notification'in window)||Notification.permission!=='granted')return;const q=await R.S.from('radio_reminders').select('*').eq('user_id',R.me.id).eq('enabled',true);if(q.error)return;R.reminders=q.data||[];const n=radioNow();for(const x of R.reminders){const [h,m]=String(x.reminder_time||'00:00').slice(0,5).split(':').map(Number),broadcast=h*60+m,adv=Number(x.advance_minutes||0),target=((broadcast-adv)%1440+1440)%1440,diff=((target-n.mins)+1440)%1440;if(diff>1)continue;const broadcastDate=broadcast-adv<0?addDays(n.date,1):n.date,entry=(R.guideEntries||[]).find(e=>e.id===x.guide_entry_id);if(entry&&(!validAt(entry,broadcastDate)||!weekdayOK(entry,broadcastDate)))continue;if(istDate(x.last_notified_at)===n.date)continue;try{new Notification('Radyo yayını yaklaşıyor',{body:`${x.station} • ${x.band} ${Number(x.frequency).toLocaleString('tr-TR')} ${x.unit} • ${String(x.reminder_time).slice(0,5)}`,icon:'icon.svg'});const at=new Date().toISOString();await R.S.from('radio_reminders').update({last_notified_at:at}).eq('id',x.id).eq('user_id',R.me.id);x.last_notified_at=at}catch(e){console.warn('Bildirim gösterilemedi',e)}}}
setInterval(()=>checkRemindersIstanbul().catch(()=>{}),60000);setTimeout(()=>checkRemindersIstanbul().catch(()=>{}),2500);

// Install prompt should be consumed once.
document.addEventListener('click',async e=>{const b=e.target.closest('[data-v35tool="install"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();$('#v33Overlay')?.remove();$('#v33Menu')?.remove();if(R.installPrompt){const p=R.installPrompt;R.installPrompt=null;try{await p.prompt();await p.userChoice}catch{}return}toast(/iphone|ipad|ipod/i.test(navigator.userAgent)?'Safari: Paylaş → Ana Ekrana Ekle':'Tarayıcı menüsünden “Uygulamayı yükle / Ana ekrana ekle” seçeneğini kullan')},true);
window.addEventListener('appinstalled',()=>{R.installPrompt=null});

// Audio upload recovery: prevent future orphan files and let existing orphan audio be recovered explicitly.
function audioDuration(){const d=Number($('#audioPreview')?.duration);return Number.isFinite(d)&&d>0?Math.round(d):null}
function goNewWithAudio(path){R.reset();R.fill('audioPath',path);$('#formSuggestionStrip').textContent='Ses dosyası bu yeni kayda bağlanmaya hazır. Kaydı kaydettiğinde ilişkilendirilecek.';R.switch('log');$('#tab-log')?.classList.add('v35-form-open');window.scrollTo({top:0,behavior:'smooth'})}
async function attachAudio(path,log){if(!log||log.audio_path)return toast(log?.audio_path?'Bu kayıtta zaten ses var.':'Kayıt bulunamadı.');const p={audio_path:path,source:'audio'},d=audioDuration();if(d)p.audio_duration_seconds=d;const q=await R.S.from('radio_logs').update(p).eq('id',log.id).eq('user_id',R.me.id);if(q.error)return toast(q.error.message);R.fill('audioPath','');await R.load();toast(`Ses “${log.station||R.freq(log)}” kaydına bağlandı.`)}
function closestRecentLog(ts,maxMin=30){const t=new Date(ts||Date.now()).getTime();let best=null;for(const x of R.logs||[]){const z=new Date(x.created_at||`${x.date}T${String(x.time).slice(0,5)}:00+03:00`).getTime(),d=Math.abs(z-t);if(!best||d<best.diff)best={log:x,diff:d}}return best&&best.diff<=maxMin*60000?best:null}
function showUploadedAudioActions(){const msg=$('#audioMsg'),path=$('#audioPath')?.value;if(!msg||!path)return;let box=$('#v36AudioActions');if(!box){box=document.createElement('div');box.id='v36AudioActions';box.className='row-actions';box.style.marginTop='8px';msg.after(box)}const editId=$('#logId')?.value,recent=closestRecentLog(Date.now(),30);box.innerHTML=`<button class="btn primary" data-v36newaudio>Yeni kayda bağla</button>${editId?'<button class="btn ghost" data-v36editgo>Düzenlenen kayda dön</button>':recent&&!recent.log.audio_path?`<button class="btn ghost" data-v36attachrecent="${recent.log.id}">Son kayda bağla: ${esc(recent.log.station||R.freq(recent.log))}</button>`:''}`;box.querySelector('[data-v36newaudio]')?.addEventListener('click',()=>goNewWithAudio(path));box.querySelector('[data-v36editgo]')?.addEventListener('click',()=>{R.switch('log');$('#tab-log')?.classList.add('v35-form-open')});box.querySelector('[data-v36attachrecent]')?.addEventListener('click',()=>{const log=R.logs.find(x=>x.id===recent.log.id);attachAudio(path,log)})}
const audioMsg=$('#audioMsg');if(audioMsg)new MutationObserver(()=>{if(audioMsg.textContent.includes('Ses yüklendi'))showUploadedAudioActions()}).observe(audioMsg,{childList:true,subtree:true,characterData:true});

async function listOrphanAudio(){if(!R.me)return[];const q=await R.S.storage.from('radio-audio').list(R.me.id,{limit:100,sortBy:{column:'created_at',order:'desc'}});if(q.error)throw q.error;const refs=new Set((R.logs||[]).map(x=>x.audio_path).filter(Boolean));return(q.data||[]).map(x=>({...x,path:`${R.me.id}/${x.name}`})).filter(x=>!refs.has(x.path))}
async function recoveryModal(){let orphans=[];try{orphans=await listOrphanAudio()}catch(e){return toast('Ses dosyaları kontrol edilemedi: '+e.message)}const html=orphans.length?orphans.map((x,i)=>{const c=closestRecentLog(x.created_at,30),size=x.metadata?.size?`${Math.round(x.metadata.size/1024)} KB`:'';return`<div class=v35-row style="align-items:flex-start"><div><strong>Bağsız ses ${i+1}</strong><span class=small>${esc(new Date(x.created_at).toLocaleString('tr-TR',{timeZone:TZ}))} ${size?'• '+size:''}</span>${c?`<span class=small>Olası kayıt: ${esc(c.log.station||R.freq(c.log))} • ${Math.round(c.diff/60000)} dk fark</span>`:'<span class=small>Yakın zamanda oluşturulmuş net bir kayıt adayı bulunamadı.</span>'}</div><div><button class="btn ghost" data-v36play="${esc(x.path)}">Dinle</button>${c&&!c.log.audio_path?` <button class="btn primary" data-v36recover="${i}">Olası kayda bağla</button>`:''} <button class="btn ghost" data-v36neworphan="${i}">Yeni kayda aktar</button></div></div>`}).join(''):'<div class=v35-note>Bağsız ses dosyası yok. Ses arşivi günlük kayıtlarıyla tutarlı.</div>';const m=document.createElement('div');m.innerHTML=html;const open=window.__v36Modal?window.__v36Modal('🎧 Ses Kurtarma',m.innerHTML):null;if(!open)return;open.addEventListener('click',async e=>{const p=e.target.closest('[data-v36play]');if(p){const s=await R.S.storage.from('radio-audio').createSignedUrl(p.dataset.v36play,600);if(s.error)return toast(s.error.message);window.open(s.data.signedUrl,'_blank');return}const r=e.target.closest('[data-v36recover]');if(r){const x=orphans[Number(r.dataset.v36recover)],c=closestRecentLog(x.created_at,30);if(c){await attachAudio(x.path,c.log);open.remove();$('#v35Bg')?.remove()}return}const n=e.target.closest('[data-v36neworphan]');if(n){const x=orphans[Number(n.dataset.v36neworphan)];$('#v35Bg')?.remove();open.remove();goNewWithAudio(x.path)}})}
function installRecoveryUI(){const card=$('#tab-audio .smart-card');if(!card||$('#v36RecoverAudio'))return;const b=document.createElement('button');b.id='v36RecoverAudio';b.className='btn ghost';b.style.marginTop='10px';b.textContent='🎧 Bağsız sesleri kontrol et';card.appendChild(b);b.onclick=recoveryModal}

// Reuse the existing V3.2.3 modal shell from the audit layer.
function findV35ModalFactory(){if(window.__v36Modal)return;window.__v36Modal=(title,html)=>{document.querySelector('#v35Bg')?.remove();document.querySelector('#v35Modal')?.remove();const bg=document.createElement('div');bg.id='v35Bg';bg.className='v35-bg';const m=document.createElement('div');m.id='v35Modal';m.className='v35-modal';m.innerHTML=`<div class=v35-head><h2>${esc(title)}</h2><button class=v35-close aria-label=Kapat>×</button></div>${html}`;bg.onclick=()=>{bg.remove();m.remove()};document.body.append(bg,m);m.querySelector('.v35-close').onclick=()=>{bg.remove();m.remove()};return m}}
findV35ModalFactory();installRecoveryUI();

// Full exports: CSV includes all log columns; JSON includes all account-scoped metadata (audio bytes are not embedded).
function csvCell(v){return'"'+String(v??'').replaceAll('"','""')+'"'}
if($('#csvBtn'))$('#csvBtn').onclick=()=>{const keys=['created_at','date','time','band','frequency','station','language','country','content_type','program','location','latitude','longitude','signal_strength','status','antenna_direction','antenna_angle','dial_position','transcript','smart_language','smart_station','smart_program','smart_confidence','audio_path','audio_duration_seconds','qsl_status','qsl_sent_at','qsl_received_at','qsl_contact','qsl_notes','source','session_id','is_mystery','mystery_status','mystery_notes','notes'];const csv='\ufeff'+[keys.join(';'),...(R.logs||[]).map(x=>keys.map(k=>csvCell(k==='time'?String(x[k]||'').slice(0,5):x[k])).join(';'))].join('\n');R.download(`radyo-kayitlari-${R.today()}.csv`,csv,'text/csv;charset=utf-8')};
if($('#jsonBtn'))$('#jsonBtn').onclick=async()=>{let settings=R.v36Settings||null,audio=[];try{if(!settings){const q=await R.S.from('radio_user_settings').select('*').eq('user_id',R.me.id).maybeSingle();settings=q.data||null}const s=await R.S.storage.from('radio-audio').list(R.me.id,{limit:500,sortBy:{column:'created_at',order:'desc'}});if(!s.error)audio=(s.data||[]).map(x=>({path:`${R.me.id}/${x.name}`,created_at:x.created_at,size:x.metadata?.size??null,mimetype:x.metadata?.mimetype??null}))}catch{}const data={version:'3.2.3-audit2',exported_at:new Date().toISOString(),timezone:TZ,audio_files_embedded:false,logs:R.logs||[],favorites:R.favorites||[],reminders:R.reminders||[],achievements:R.achievements||[],dial_calibrations:R.v25Calibrations||[],listening_sessions:R.v25Sessions||[],session_attempts:R.v25Attempts||[],ai_analyses:R.v30Analyses||[],settings,audio_manifest:audio};R.download(`radyo-gunlugu-tam-yedek-${R.today()}.json`,JSON.stringify(data,null,2),'application/json');toast('Tam metadata yedeği hazırlandı. Ses dosyalarının kendisi JSON içine gömülmez.')};

// If the optional module loader reports a failure, boot the base app instead of leaving a dead login screen.
const authMsg=$('#authMsg');if(authMsg)new MutationObserver(()=>{if(authMsg.textContent.startsWith('Uygulama başlatılamadı:')&&!R.__booted){R.__booted=true;R.boot().then(()=>{authMsg.textContent='Bazı gelişmiş modüller yüklenemedi; temel uygulama açıldı.'}).catch(e=>{authMsg.textContent='Uygulama başlatılamadı: '+e.message})}}).observe(authMsg,{childList:true,subtree:true,characterData:true});

// Keep compatibility and recovery hooks alive after late-rendering modules.
setInterval(()=>{ensureCompatHome();patchAchievements();installRecoveryUI();observeHome()},30000);
})();