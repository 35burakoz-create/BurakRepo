(()=>{
const R=window.R;if(!R||R.__guideService390)return;R.__guideService390=true;
const C=globalThis.RADIO_APP_CONFIG||{timezone:'Europe/Istanbul'};const TZ=C.timezone||'Europe/Istanbul';
const norm=v=>R.norm?R.norm(v):String(v??'').toLocaleLowerCase('tr-TR');
const wallFmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
let historyLogsRef=null,historyByBand=new Map();
function modeForBand(band){return String(band||'').startsWith('SW')?'SW':String(band||'')}
function bandOf(e){return e?.mode==='SW'?(e.band||'SW'):(e?.mode||e?.band||'')}
function unitOf(e){return e?.unit||(bandOf(e)==='FM'?'MHz':'kHz')}
function receiverCompatible(e){const band=bandOf(e),range=C.receiver?.bands?.[band],f=Number(e?.frequency);if(!range)return true;return Number.isFinite(f)&&f>=Number(range.min)&&f<=Number(range.max)}
function minuteOf(time){const[h,m]=String(time||'00:00').slice(0,5).split(':').map(Number);return(h||0)*60+(m||0)}
function inRange(minute,range){let[a,b]=range||[];a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b))return false;if(b===1440)return minute>=a;if(a===b)return true;return a<b?minute>=a&&minute<b:minute>=a||minute<b}
function dayOf(date){return new Date(`${date||R.clock?.today?.()||new Date().toLocaleDateString('en-CA')}T12:00:00Z`).getUTCDay()}
function scheduleMeta(e){const s=e?.raw?.schedule;return s&&typeof s==='object'?s:null}
function wallTimeToInstant(date,time){
  const [y,mo,d]=String(date||R.clock?.today?.()||'').split('-').map(Number),[h,mi]=String(time||R.clock?.time?.()||'00:00').slice(0,5).split(':').map(Number);
  if(!y||!mo||!d)return new Date();
  const target=Date.UTC(y,mo-1,d,h||0,mi||0);let ts=target;
  for(let i=0;i<3;i++){const p=Object.fromEntries(wallFmt.formatToParts(new Date(ts)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])),seen=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute),delta=target-seen;ts+=delta;if(!delta)break}
  return new Date(ts)
}
function utcContext(date,time){
  const d=wallTimeToInstant(date,time),iso=d.toISOString(),isoDay=d.getUTCDay()||7;
  return{instant:d,date:iso.slice(0,10),minute:d.getUTCHours()*60+d.getUTCMinutes(),isoDay,prevIsoDay:isoDay===1?7:isoDay-1}
}
function addUtcDays(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function scheduleState(e,date,time){
  const s=scheduleMeta(e);if(!s)return null;const c=utcContext(date,time),start=Number(s.start_minute),end=Number(s.end_minute),days=String(s.days_iso||'1234567');
  if(!Number.isFinite(start)||!Number.isFinite(end))return{active:false,valid:false,ctx:c};
  let inside=false,startDay=c.isoDay,startDate=c.date;
  if(s.all_day||start===end){inside=true}
  else if(start<end){inside=c.minute>=start&&(end===1440||c.minute<end)}
  else if(c.minute>=start){inside=true}
  else if(c.minute<end){inside=true;startDay=c.prevIsoDay;startDate=addUtcDays(c.date,-1)}
  const valid=(!e?.valid_from||startDate>=e.valid_from)&&(!e?.valid_to||startDate<=e.valid_to),weekday=days.includes(String(startDay));
  return{active:inside&&valid&&weekday,valid,weekday,ctx:c,startDate,startDay}
}
function weekdayOK(e,date,time){const s=scheduleState(e,date,time);if(s)return s.weekday;const t=norm(e?.time_text||''),w=dayOf(date);if(t.includes('hafta ici'))return w>=1&&w<=5;if(t.includes('hafta sonu'))return w===0||w===6;if(t.includes('pazar'))return w===0;if(t.includes('cumartesi'))return w===6;return true}
function validAt(e,date,time){const s=scheduleState(e,date,time);if(s)return s.valid;return(!e?.valid_from||date>=e.valid_from)&&(!e?.valid_to||date<=e.valid_to)}
function activeAt(e,date,time){if(!receiverCompatible(e))return false;const s=scheduleState(e,date,time);if(s)return s.active;if(!weekdayOK(e,date,time)||!validAt(e,date,time))return false;if(Array.isArray(e?.time_ranges)&&e.time_ranges.length)return e.time_ranges.some(r=>inRange(minuteOf(time),r));return e?.mode==='FM'}
function profileAdjustment(e,time){if(e?.mode!=='SW')return{score:0,why:null};const m=minuteOf(time),p=(R.bandProfiles||[]).find(x=>x.band===e.band&&inRange(m,[x.start_minute,x.end_minute]));if(!p)return{score:0,why:null};const n=({'Çok iyi':15,'İyi':8,'Iyi':8,'Orta':0,'Zayıf':-12,'Boş':-25,'Genelde boş':-25})[p.rating]||0;return{score:n,why:`${e.band}: ${p.rating}`}}
function rebuildHistoryIndex(){const logs=R.logs||[];if(logs===historyLogsRef)return;historyLogsRef=logs;historyByBand=new Map();for(const x of logs){if(!x?.signal_strength)continue;const f=Number(x.frequency),band=String(x.band||'');if(!band||!Number.isFinite(f))continue;if(!historyByBand.has(band))historyByBand.set(band,[]);historyByBand.get(band).push({frequency:f,signal:Number(x.signal_strength)})}for(const rows of historyByBand.values())rows.sort((a,b)=>a.frequency-b.frequency)}
function lowerBound(rows,value){let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].frequency<value)lo=mid+1;else hi=mid}return lo}
function historyAdjustment(e){const tol=e?.mode==='FM'?.25:e?.mode==='MW'?12:30,f=Number(e?.frequency),band=String(e?.mode==='SW'?e?.band:e?.mode||'');if(!Number.isFinite(f)||!band)return{score:0,why:null,count:0};rebuildHistoryIndex();const rows=historyByBand.get(band)||[];let i=lowerBound(rows,f-tol),sum=0,count=0;for(;i<rows.length&&rows[i].frequency<=f+tol;i++){sum+=rows[i].signal;count++}if(!count)return{score:0,why:null,count:0};const avg=sum/count;return{score:Math.round((avg-2.5)*5),why:`Geçmiş kayıtların: ${count} kayıt, ortalama ${avg.toFixed(1)}/5`,count,avg}}
function searchText(e){return R.broadcastLocale?.searchText?.(e)||[e?.station,e?.country,e?.language_content,e?.content_hint,e?.time_text,e?.source_doc,e?.raw?.schedule?.tx_site_name,e?.raw?.schedule?.target].filter(Boolean).join(' ')}
function scoreEntry(e,{date,time}={}){const p=R.clock?.parts?.()||{},d=date||p.date||new Date().toLocaleDateString('en-CA'),t=time||`${String(p.hour??new Date().getHours()).padStart(2,'0')}:${String(p.minute??new Date().getMinutes()).padStart(2,'0')}`;let score=Number(e?.probability_score||50),why=[];if(!receiverCompatible(e))return{score:1,why:['TECSUN R-9012 frekans aralığının dışında'],active:false,valid:false,history:{score:0,why:null,count:0}};const valid=validAt(e,d,t),active=activeAt(e,d,t);if(valid)why.push('yayın çizelgesi geçerli');else{score-=50;why.push('yayın çizelgesinin tarih aralığı dışında')}if(Array.isArray(e?.time_ranges)&&e.time_ranges.length){if(active){score+=22;why.push(scheduleMeta(e)?'Türkiye saatine çevrilen yayın saati eşleşiyor':'yayın saati eşleşiyor')}else{score-=30;why.push('yayın saati dışında')}}else if(e?.mode==='FM'){score+=5;why.push('FM yayını gün boyu aday')}const bp=profileAdjustment(e,t);score+=bp.score;if(bp.why)why.push(bp.why);const h=historyAdjustment(e);score+=h.score;if(h.why)why.push(h.why);return{score:Math.max(1,Math.min(99,Math.round(score))),why,active,valid,history:h}}
function identify({mode,band,frequency,text='',language='',date,time,limit=5}={}){const m=mode||modeForBand(band),f=Number(frequency);if(!Number.isFinite(f)||f<=0)return[];const tol=m==='FM'?.35:m==='MW'?18:40,wanted=norm([language,text].filter(Boolean).join(' '));return(R.guideEntries||[]).filter(e=>e.entry_type==='station_target'&&receiverCompatible(e)&&e.mode===m&&(m!=='SW'||!band||e.band===band)&&Math.abs(Number(e.frequency)-f)<=tol).map(e=>{const dist=Math.abs(Number(e.frequency)-f),base=scoreEntry(e,{date,time}),hay=norm(searchText(e));let score=base.score*.55+Math.max(0,34*(1-dist/tol)),why=[...base.why,`frekans farkı ${dist.toLocaleString('tr-TR',{maximumFractionDigits:2})} ${unitOf(e)}`];if(wanted){const tokens=wanted.split(/\s+/).filter(x=>x.length>=3),matches=tokens.filter(x=>hay.includes(x)).length;if(matches){score+=Math.min(18,matches*6);why.push('dil veya metin eşleşmesi')}}return{...e,_identifyScore:Math.max(1,Math.min(99,Math.round(score))),_identifyWhy:why,_distance:dist}}).sort((a,b)=>b._identifyScore-a._identifyScore||a._distance-b._distance).slice(0,Math.max(1,Number(limit)||5))}
function entries({band='',query='',frequency=null,activeOnly=false,source='',date,time,limit=150}={}){const q=norm(query),f=Number(frequency),sourceRows=(R.guideEntries||[]).filter(x=>x.entry_type==='station_target'&&receiverCompatible(x));return sourceRows.filter(x=>{const b=bandOf(x),tol=x.mode==='FM'?.3:x.mode==='MW'?12:25,sourceOK=!source||(source==='A26'?x.season==='A26':x.source_doc===source);return sourceOK&&(!band||b===band)&&(!Number.isFinite(f)||f<=0||Math.abs(Number(x.frequency)-f)<=tol)&&(!q||norm(searchText(x)).includes(q))&&(!activeOnly||activeAt(x,date||R.clock?.today?.(),time||R.clock?.time?.()))}).map(x=>({...x,_guideScore:scoreEntry(x,{date,time})})).sort((a,b)=>(Number(b._guideScore?.active)-Number(a._guideScore?.active))||b._guideScore.score-a._guideScore.score||String(a.mode).localeCompare(String(b.mode))||Number(a.frequency)-Number(b.frequency)).slice(0,Math.max(1,Number(limit)||150))}
const api={modeForBand,bandOf,unitOf,receiverCompatible,inRange,weekdayOK,validAt,activeAt,scoreEntry,identify,entries,scheduleMeta,wallTimeToInstant,utcContext,scheduleState,searchText,display:e=>R.broadcastLocale?.entry?.(e)||{}};
R.guideService=api;R.scoreEntry=e=>scoreEntry(e);R.features?.register?.('guide-service',{ready:true,provider:'app-guide-service'});R.events?.emit?.('guide:service-ready',{provider:'app-guide-service'});
})();
