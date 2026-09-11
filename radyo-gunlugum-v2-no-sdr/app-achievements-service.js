(()=>{
const R=window.R;if(!R||R.__achievementsService379)return;R.__achievementsService379=true;
const norm=v=>R.norm?R.norm(v):String(v??'').toLocaleLowerCase('tr-TR');
const split=v=>String(v||'').split(/[/,;]/).map(x=>x.trim()).filter(Boolean);
const state={rows:[],loaded:false,userId:null,loading:null,syncing:null};
function uniqueDisplay(fn){const map=new Map();for(const log of R.logs||[])for(const raw of fn(log)||[]){const v=String(raw||'').trim(),k=norm(v);if(v&&k&&!map.has(k))map.set(k,v)}return[...map.values()]}
function hourOf(x){return Number(String(x.time||'00:00').slice(0,2))}
function maxStreak(){const dates=[...new Set((R.logs||[]).map(x=>x.date).filter(Boolean))].sort();if(!dates.length)return 0;let best=1,run=1;for(let i=1;i<dates.length;i++){const a=new Date(`${dates[i-1]}T12:00:00Z`),b=new Date(`${dates[i]}T12:00:00Z`);if(Math.round((b-a)/86400000)===1){run++;best=Math.max(best,run)}else run=1}return best}
function stats(){const countries=uniqueDisplay(x=>split(x.country)),languages=uniqueDisplay(x=>split(x.language)),stations=uniqueDisplay(x=>[x.station||x.smart_station]),bands=new Set((R.logs||[]).map(x=>String(x.band||'')));return{logs:(R.logs||[]).length,countries:countries.length,languages:languages.length,stations:stations.length,maxStreak:maxStreak(),hasFM:bands.has('FM'),hasMW:bands.has('MW'),hasSW:[...bands].some(x=>x.startsWith('SW')),countryNames:countries,languageNames:languages,stationNames:stations,confirmed:(R.logs||[]).filter(x=>x.status==='confirmed').length,audio:(R.logs||[]).filter(x=>x.audio_path).length,qslReceived:(R.logs||[]).filter(x=>x.qsl_status==='received').length}}
const DEF=[
 ['first_log','📻','İlk Sinyal','İlk dinleme kaydını oluştur.',s=>s.logs>=1],
 ['five_logs','🗒️','Saha Günlüğü','5 dinleme kaydına ulaş.',s=>s.logs>=5],
 ['ten_logs','📚','Arşivci','10 dinleme kaydına ulaş.',s=>s.logs>=10],
 ['twentyfive_logs','🗃️','Ciddi Arşiv','25 dinleme kaydına ulaş.',s=>s.logs>=25],
 ['first_confirmed','✅','Kimliği Belirlendi','Bir yayını doğrulanmış olarak kaydet.',()=>R.logs.some(x=>x.status==='confirmed')],
 ['signal_five','📶','Kısa Dalga 5/5','Bir kısa dalga yayınını 5/5 sinyalle kaydet.',()=>R.logs.some(x=>String(x.band||'').startsWith('SW')&&Number(x.signal_strength)===5)],
 ['first_sw','🌐','Kısa Dalga Kaşifi','İlk SW kaydını oluştur.',s=>s.hasSW],
 ['first_mw','🌙','Orta Dalga Kaşifi','İlk MW kaydını oluştur.',s=>s.hasMW],
 ['first_fm','🎵','Yerel Eter','İlk FM kaydını oluştur.',s=>s.hasFM],
 ['band_trinity','📡','Üç Bant','FM, MW ve SW bantlarının üçünü de kaydet.',s=>s.hasFM&&s.hasMW&&s.hasSW],
 ['three_languages','🗣️','Çok Dilli Eter','3 farklı dil kaydet.',s=>s.languages>=3],
 ['five_languages','🌍','Dil Avcısı','5 farklı dil kaydet.',s=>s.languages>=5],
 ['five_countries','🧭','Ülke Avcısı','5 farklı ülke kaydet.',s=>s.countries>=5],
 ['ten_countries','🗺️','Eter Atlası','10 farklı ülke kaydet.',s=>s.countries>=10],
 ['ten_stations','🏛️','İstasyon Koleksiyoncusu','10 farklı istasyon kaydet.',s=>s.stations>=10],
 ['first_audio','🎙️','Ses Kanıtı','Bir kayda gerçek ses örneği ekle.',()=>R.logs.some(x=>x.audio_path)],
 ['first_transcript','📝','Eterden Metne','Bir yayının konuşma dökümünü kaydet.',()=>R.logs.some(x=>String(x.transcript||'').trim())],
 ['first_qsl_sent','✉️','İlk QSL','İlk QSL raporunu gönder.',()=>R.logs.some(x=>['sent','received'].includes(x.qsl_status))],
 ['first_qsl_received','📬','Eterden Yanıt','İlk QSL yanıtını al.',()=>R.logs.some(x=>x.qsl_status==='received')],
 ['night_owl','🦉','Gece MW','00.00–04.59 arasında bir MW yayını kaydet.',()=>R.logs.some(x=>x.band==='MW'&&hourOf(x)<5)],
 ['japanese','🇯🇵','Japonca Yayın','İlk Japonca yayını kaydet.',s=>s.languageNames.some(x=>norm(x).includes('japon')||norm(x).includes('japanese'))],
 ['streak_3','🔥','3 Günlük Seri','3 gün üst üste kayıt tut.',s=>s.maxStreak>=3],
 ['streak_7','🔥','Bir Haftalık Seri','7 gün üst üste kayıt tut.',s=>s.maxStreak>=7],
 ['streak_14','🏕️','Saha Alışkanlığı','14 gün üst üste kayıt tut.',s=>s.maxStreak>=14]
].map(([key,icon,title,desc,test])=>({key,icon,title,desc,test}));
function unlocked(){return new Set(state.rows.map(x=>x.achievement_key))}
async function fetchRows(){const q=await R.S.from('radio_achievements').select('*').eq('user_id',R.me.id).order('unlocked_at',{ascending:false});if(q.error)throw q.error;state.rows=q.data||[];state.loaded=true;state.userId=R.me.id;R.achievements=state.rows;R.events?.emit?.('achievements:data',{count:state.rows.length,total:DEF.length});return state.rows}
async function load({force=false,sync=true}={}){if(!R.me){state.rows=[];state.loaded=false;state.userId=null;R.achievements=[];return state}if(!force&&state.loaded&&state.userId===R.me.id){if(sync)await syncEarned();return state}if(state.loading)return state.loading;state.loading=(async()=>{await fetchRows();if(sync)await syncEarned();return state})().finally(()=>state.loading=null);return state.loading}
async function syncEarned(){if(!R.me||state.syncing)return state.syncing;state.syncing=(async()=>{const s=stats(),old=unlocked(),earned=DEF.filter(d=>{try{return d.test(s)&&!old.has(d.key)}catch{return false}});if(!earned.length)return[];const rows=earned.map(d=>({user_id:R.me.id,achievement_key:d.key,metadata:{title:d.title}})),q=await R.S.from('radio_achievements').upsert(rows,{onConflict:'user_id,achievement_key',ignoreDuplicates:true});if(q.error){R.reportError?.(q.error,'achievement-sync',{silent:true});return[]}const before=old;await fetchRows();const freshSet=unlocked(),newlyEarned=earned.filter(d=>!before.has(d.key)&&freshSet.has(d.key));if(newlyEarned.length){R.events?.emit?.('achievements:unlocked',{earned:newlyEarned.map(x=>x.key),count:state.rows.length});if(R.toast)R.toast(newlyEarned.length===1?`🏆 Yeni rozet: ${newlyEarned[0].title}`:`🏆 ${newlyEarned.length} yeni rozet açıldı`)}return newlyEarned})().finally(()=>state.syncing=null);return state.syncing}
function progress(){const s=stats(),open=unlocked();return{stats:s,unlocked:state.rows,total:DEF.length,count:open.size,percent:DEF.length?Math.round(open.size/DEF.length*100):0,definitions:DEF.map(d=>({...d,unlocked:open.has(d.key),row:state.rows.find(x=>x.achievement_key===d.key)||null}))}}
R.achievementDefs=DEF;R.achievements=state.rows;R.achievementsService={state,definitions:DEF,stats,progress,load,sync:syncEarned};
R.events?.on?.('auth:changed',x=>{if(x?.authenticated)load({force:true}).catch(e=>R.reportError?.(e,'achievements-auth',{silent:true}));else load({sync:false})});
R.events?.on?.('data:loaded',()=>syncEarned().catch(e=>R.reportError?.(e,'achievements-data',{silent:true})));
setTimeout(()=>{if(R.me)load().catch(e=>R.reportError?.(e,'achievements-initial',{silent:true}))},650);
R.features?.register?.('achievements-service',{ready:true,provider:'app-achievements-service'});
})();
