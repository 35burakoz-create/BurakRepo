(()=>{
const R=window.R;if(!R||R.__qslService385)return;R.__qslService385=true;
const C=globalThis.RADIO_APP_CONFIG||{origin:{name:'Bozköy, Torbalı, İzmir'},timezone:'Europe/Istanbul',receiver:{model:'TECSUN R-9012'}};
const TZ=C.timezone||'Europe/Istanbul';
const RECEIVER=C.receiver?.model||'TECSUN R-9012';
const clean=v=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const dateFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'});
const numberFmt=new Intl.NumberFormat('en-US',{useGrouping:false,maximumFractionDigits:3});

const LANGUAGE_EN=Object.freeze({
 'ingilizce':'English','fransizca':'French','almanca':'German','ispanyolca':'Spanish','italyanca':'Italian','rusca':'Russian','arapca':'Arabic','romence':'Romanian','japonca':'Japanese','korece':'Korean','farsca':'Persian','cince':'Chinese','mandarin cincesi':'Mandarin Chinese','standart cince':'Standard Chinese','standart arapca':'Standard Arabic','kantonca':'Cantonese','hakka cincesi':'Hakka Chinese','min nan cincesi':'Min Nan Chinese','turkce':'Turkish','portekizce':'Portuguese','felemenkce':'Dutch','ukraynaca':'Ukrainian','lehce':'Polish','cekce':'Czech','sirpca':'Serbian','hirvatca':'Croatian','arnavutca':'Albanian','bulgarca':'Bulgarian','ermence':'Armenian','gurcuce':'Georgian','macarca':'Hungarian','fince':'Finnish','isvecce':'Swedish','yunanca':'Greek','ibranice':'Hebrew','darice':'Dari','pestuca':'Pashto','urduca':'Urdu','hintce':'Hindi','bengalce':'Bengali','tamilce':'Tamil','teluguca':'Telugu','nepalce':'Nepali','sinhala':'Sinhala','endonezce':'Indonesian','tagalogca':'Tagalog','vietnamca':'Vietnamese','tayca':'Thai','kmerce':'Khmer','laoca':'Lao','birmanca':'Burmese','mogolca':'Mongolian','uygurca':'Uyghur','kazakca':'Kazakh','kirgizca':'Kyrgyz','tacikce':'Tajik','turkmence':'Turkmen','kurtce':'Kurdish','azerbaycanca':'Azerbaijani','amharca':'Amharic','somalice':'Somali','oromoca':'Oromo','hausaca':'Hausa','svahili':'Swahili','tigrinya':'Tigrinya','yorubaca':'Yoruba','malgasca':'Malagasy','belucca':'Balochi','kinyarwanda':'Kinyarwanda','esperanto':'Esperanto','bislama':'Bislama','birden cok dil':'Multiple languages','belirtilmemis':'Unspecified'
});
const COUNTRY_EN=Object.freeze({
 'cin':'China','tayvan':'Taiwan','amerika birlesik devletleri':'United States','abd':'United States','birlesik krallik':'United Kingdom','kuzey kore':'North Korea','guney kore':'South Korea','japonya':'Japan','ispanya':'Spain','romanya':'Romania','iran':'Iran','vietnam':'Vietnam','hindistan':'India','esvatini':'Eswatini','vatikan':'Vatican City','kuba':'Cuba','cezayir':'Algeria','fransa':'France','avustralya':'Australia','macaristan':'Hungary','brezilya':'Brazil','almanya':'Germany','yeni zelanda':'New Zealand','filipinler':'Philippines','turkiye':'Türkiye','endonezya':'Indonesia','kanada':'Canada','ekvador':'Ecuador','finlandiya':'Finland','alaska (abd)':'Alaska (USA)','isvec':'Sweden','malezya':'Malaysia','hollanda':'Netherlands','polonya':'Poland','peru':'Peru','rusya':'Russia','etiyopya':'Ethiopia','tunus':'Tunisia','madagaskar':'Madagascar','myanmar':'Myanmar','italya':'Italy','vanuatu':'Vanuatu','misir':'Egypt','cekya':'Czechia','slovakya':'Slovakia','mogolistan':'Mongolia','mali':'Mali','ukrayna':'Ukraine','kolombiya':'Colombia','solomon adalari':'Solomon Islands','meksika':'Mexico','cad':'Chad','kuveyt':'Kuwait','liberya':'Liberia','isvicre':'Switzerland','bolivya':'Bolivia','belcika':'Belgium','hong kong':'Hong Kong','birlesmis milletler':'United Nations','guam':'Guam','kenya':'Kenya','porto riko':'Puerto Rico','kongo cumhuriyeti':'Republic of the Congo','irlanda':'Ireland','ozbekistan':'Uzbekistan','sri lanka':'Sri Lanka','izlanda':'Iceland','danimarka':'Denmark','fildisi sahili':"Côte d'Ivoire",'hawaii (abd)':'Hawaii (USA)','gizli / bagimsiz yayin':'Clandestine / independent transmission','birlesik arap emirlikleri':'United Arab Emirates','umman':'Oman','bulgaristan':'Bulgaria','ermenistan':'Armenia','tayland':'Thailand','sudan':'Sudan','botsvana':'Botswana','luksemburg':'Luxembourg','suudi arabistan':'Saudi Arabia'
});
const COUNTRY_CODE_EN=Object.freeze({
 CHN:'China',TWN:'Taiwan',USA:'United States',G:'United Kingdom',KRE:'North Korea',KOR:'South Korea',J:'Japan',E:'Spain',ROU:'Romania',IRN:'Iran',VTN:'Vietnam',IND:'India',SWZ:'Eswatini',CVA:'Vatican City',CUB:'Cuba',ALG:'Algeria',F:'France',AUS:'Australia',HNG:'Hungary',B:'Brazil',D:'Germany',NZL:'New Zealand',PHL:'Philippines',TUR:'Türkiye',INS:'Indonesia',CAN:'Canada',EQA:'Ecuador',FIN:'Finland',S:'Sweden',MLA:'Malaysia',HOL:'Netherlands',POL:'Poland',PRU:'Peru',RUS:'Russia',ETH:'Ethiopia',TUN:'Tunisia',MDG:'Madagascar',MYA:'Myanmar',I:'Italy',VUT:'Vanuatu',EGY:'Egypt',CZE:'Czechia',SVK:'Slovakia',MNG:'Mongolia',MLI:'Mali',UKR:'Ukraine',CLM:'Colombia',SLM:'Solomon Islands',MEX:'Mexico',TCD:'Chad',KWT:'Kuwait',LBR:'Liberia',SUI:'Switzerland',BOL:'Bolivia',BEL:'Belgium',HKG:'Hong Kong',UN:'United Nations',GUM:'Guam',KEN:'Kenya',PTR:'Puerto Rico',COG:'Republic of the Congo',IRL:'Ireland',UZB:'Uzbekistan',CLN:'Sri Lanka',ISL:'Iceland',DNK:'Denmark',CTI:"Côte d'Ivoire",UAE:'United Arab Emirates',OMA:'Oman',BUL:'Bulgaria',ARM:'Armenia',THA:'Thailand',SDN:'Sudan',BOT:'Botswana',LUX:'Luxembourg'
});

function formatDate(value){
 const raw=clean(value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
 const d=new Date(`${raw}T12:00:00Z`);
 return Number.isNaN(d.getTime())?raw:dateFmt.format(d);
}
function formatTime(value){const m=clean(value).match(/^(\d{1,2}):(\d{2})/);return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:clean(value)}
function englishLanguage(value){
 const raw=clean(value);if(!raw)return'';
 const direct=LANGUAGE_EN[fold(raw)];if(direct)return direct;
 const parts=raw.split(/[;,/+]/).map(x=>clean(x)).filter(Boolean);
 if(parts.length>1)return[...new Set(parts.map(x=>LANGUAGE_EN[fold(x)]||x))].join(', ');
 return raw;
}
function englishCountry(value){
 const raw=clean(value);if(!raw)return'';
 if(COUNTRY_CODE_EN[raw.toUpperCase()])return COUNTRY_CODE_EN[raw.toUpperCase()];
 return COUNTRY_EN[fold(raw)]||raw;
}
function formatFrequency(log){
 const n=Number(log?.frequency);if(!Number.isFinite(n))return'';
 const unit=clean(log?.unit)||(log?.band==='FM'?'MHz':'kHz');
 return`${numberFmt.format(n)} ${unit}`;
}
function signalReport(value){
 const n=Number(value);if(!Number.isFinite(n)||n<1||n>5)return'Not recorded';
 const label={1:'very weak',2:'weak',3:'fair',4:'good',5:'very good'}[Math.round(n)]||'recorded';
 return`${Math.round(n)}/5 (${label}; personal listening scale)`;
}
function utcStamp(log){
 const time=String(log?.time||'00:00').slice(0,5),date=String(log?.date||''),canonical=R.guideService?.wallTimeToInstant?.(date,time),d=canonical instanceof Date?canonical:new Date(`${date}T${time}:00+03:00`);
 if(Number.isNaN(d.getTime()))return{date,time};
 return{date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,16)};
}
function report(log){
 const x=log||{},station=clean(x.station||x.smart_station||'Unknown station'),utc=utcStamp(x);
 const country=englishCountry(x.country),language=englishLanguage(x.language);
 const details=clean(x.program||x.transcript),notes=clean(x.notes),frequency=formatFrequency(x);
 const fields=[
  `Station: ${station}`,
  country&&`Country: ${country}`,
  utc.date&&`UTC date: ${formatDate(utc.date)}`,
  utc.time&&`UTC time: ${formatTime(utc.time)} UTC`,
  x.date&&`Local date: ${formatDate(x.date)}`,
  x.time&&`Local time (${TZ}): ${formatTime(x.time)}`,
  frequency&&`Frequency: ${frequency}`,
  clean(x.band)&&`Band: ${clean(x.band)}`,
  `Reception site: ${clean(x.location||C.origin?.name||'Bozköy, Torbalı, İzmir')}`,
  `Receiver: ${RECEIVER}`,
  language&&`Broadcast language: ${language}`,
  `Signal strength: ${signalReport(x.signal_strength)}`
 ].filter(Boolean);
 const sections=[
  'Reception Report and QSL Request','',
  'Dear Sir or Madam,','',
  `I am pleased to submit the following reception report for ${station}.`,'',
  ...fields,'',
  'Programme details / identification heard:',
  details||'No additional programme details were logged.'
 ];
 if(notes&&fold(notes)!==fold(details))sections.push('','Additional reception notes:',notes);
 sections.push(
  '',
  'This report was prepared from my listening log. Signal strength is shown on my personal 1–5 listening scale and is not a calibrated SINPO or S-meter reading.',
  '',
  'I would be grateful if you could confirm this reception with a QSL card or e-QSL. If you need any additional reception details, I will be happy to provide them.',
  '',
  'Thank you for your broadcast and for taking the time to verify my report.',
  '',
  'Kind regards'
 );
 return sections.join('\n');
}
async function setStatus(id,status){
 if(!R.me)throw new Error('QSL güncellemesi için giriş gerekli.');
 if(!['planned','sent','received'].includes(status))throw new Error('Geçersiz QSL durumu.');
 const today=R.clock?.today?.()||R.today?.()||new Date().toISOString().slice(0,10),patch=status==='planned'?{qsl_status:'planned'}:status==='sent'?{qsl_status:'sent',qsl_sent_at:today}:{qsl_status:'received',qsl_received_at:today};
 const q=await R.S.from('radio_logs').update(patch).eq('id',id).eq('user_id',R.me.id).select().maybeSingle();
 if(q.error)throw q.error;await R.load?.();R.events?.emit?.('qsl:updated',{id,status,row:q.data||null});return q.data||null;
}
R.qsl=report;
R.qslService={report,utcStamp,setStatus,englishLanguage,englishCountry,formatDate,formatFrequency,signalReport};
R.features?.register?.('qsl-service',{ready:true,provider:'app-qsl-service'});
})();
