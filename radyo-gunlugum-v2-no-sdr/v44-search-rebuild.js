(()=>{
const R=window.R;if(!R)return;
const VERSION='V3.6.2';
const $=s=>document.querySelector(s);
let root=null,input=null,status=null,results=null,liveTimer=null;
function loadCss(){if(document.querySelector('link[data-v44-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='v44-search-rebuild.css';l.dataset.v44Css='1';document.head.appendChild(l)}
const norm=v=>{const s=String(v??'');try{return R.norm?R.norm(s):s.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')}catch{return s.toLowerCase()}};
const stationOf=x=>String(x?.station||x?.smart_station||'').trim();
const split=v=>String(v||'').split(/[/,;]/).map(x=>x.trim()).filter(Boolean);
const unitOf=x=>(x?.band||x?.mode)==='FM'?'MHz':'kHz';
const fmtFreq=x=>`${Number(x?.frequency||0).toLocaleString('tr-TR',{maximumFractionDigits:3})} ${unitOf(x)}`;
const TOOLS=[
 ['Yayılım Asistanı','Gray-line, Kp ve kişisel bant tahmini','propagation'],
 ['Radyo Hafızası','İstasyon, frekans ve ülke profilleri','memory'],
 ['Şu An','Aktif yayın adayları','now'],
 ['Yayın Rehberi','Frekans ve yayın saatleri','guide'],
 ['AI Ses Analizi','Ses kaydından dil ve istasyon adayları','ai'],
 ['QSL Merkezi','Reception report ve cevap takibi','qsl'],
 ['Radyo Atlası','Ülke ve dinleme haritası','atlas'],
 ['Takvim','Dinleme günleri','calendar'],
 ['İstatistikler','Bant ve çekim analizi','analysis']
];
function close(){
  document.querySelector('#v44SearchOverlay')?.remove();
  document.querySelector('#v44Search')?.remove();
  document.documentElement.classList.remove('v44-search-open');
  root=input=status=results=null;
}
function frequencyMatches(value,q){
  const f=Number(value),n=Number(String(q).replace(',','.'));
  if(!Number.isFinite(f)||!Number.isFinite(n))return false;
  const candidates=[Math.abs(f-n),Math.abs(f*1000-n),Math.abs(f-n*1000)];
  const tolerance=Math.max(0.02,Math.abs(n)*0.0008);
  return Math.min(...candidates)<=tolerance;
}
function uniqueBy(items,keyFn){const m=new Map();for(const x of items){const k=keyFn(x);if(k&&!m.has(k))m.set(k,x)}return [...m.values()]}
function quickGroups(){return[{title:'Hızlı erişim',items:TOOLS.slice(0,6).map(([t,m,tab])=>({type:'Araç',title:t,meta:m,action:()=>openTool(tab)}))}]}
function searchData(query){
  const q=String(query||'').trim(),nq=norm(q),logs=Array.isArray(R.logs)?R.logs:[],guides=Array.isArray(R.guideEntries)?R.guideEntries:[];
  if(!q)return{query:q,total:0,groups:quickGroups()};
  const logMatches=logs.filter(x=>norm([stationOf(x),x.country,x.language,x.program,x.notes,x.transcript,x.smart_station,x.smart_program,x.band,x.frequency].join(' ')).includes(nq)||frequencyMatches(x.frequency,q)).slice(0,10);
  const stations=uniqueBy(logs.filter(x=>stationOf(x)&&norm(stationOf(x)).includes(nq)),x=>norm(stationOf(x))).slice(0,6).map(x=>({label:stationOf(x),key:norm(stationOf(x))}));
  const countries=uniqueBy(logs.flatMap(x=>split(x.country).map(c=>({label:c,key:norm(c)}))).filter(x=>x.key.includes(nq)),x=>x.key).slice(0,6);
  const frequencies=uniqueBy(logs.filter(x=>frequencyMatches(x.frequency,q)||norm(`${x.frequency} ${x.band}`).includes(nq)),x=>`${x.band}|${Number(x.frequency).toFixed(3)}`).slice(0,6);
  const guideMatches=guides.filter(x=>norm([x.station,x.country,x.language_content,x.frequency,x.content_hint,x.time_text,x.band,x.mode].join(' ')).includes(nq)||frequencyMatches(x.frequency,q)).slice(0,8);
  const tools=TOOLS.filter(([t,m])=>norm(`${t} ${m}`).includes(nq)).slice(0,6);
  const groups=[];
  if(stations.length)groups.push({title:'İstasyonlar',items:stations.map(x=>({type:'İstasyon',title:x.label,meta:'Radyo Hafızası profili',action:()=>openMemory('station',x.key)}))});
  if(countries.length)groups.push({title:'Ülkeler',items:countries.map(x=>({type:'Ülke',title:x.label,meta:'Kişisel ülke profili',action:()=>openMemory('country',x.key)}))});
  if(frequencies.length)groups.push({title:'Frekanslar',items:frequencies.map(x=>({type:'Frekans',title:fmtFreq(x),meta:[x.band,stationOf(x)||'Kayıt'].filter(Boolean).join(' · '),action:()=>openMemory('frequency',`${x.band}|${Number(x.frequency).toFixed(3)}`)}))});
  if(logMatches.length)groups.push({title:'Kayıtlar',items:logMatches.map(x=>({type:'Kayıt',title:stationOf(x)||`${x.band||''} ${x.frequency||''}`.trim(),meta:[x.date,x.time?.slice?.(0,5),x.band,x.language].filter(Boolean).join(' · '),action:()=>openLog(x.id)}))});
  if(guideMatches.length)groups.push({title:'Yayın Rehberi',items:guideMatches.map(x=>({type:'Rehber',title:x.station||'Aday yayın',meta:[x.band||x.mode,fmtFreq(x),String(x.language_content||'').split(/[;/,]/)[0],x.time_text].filter(Boolean).join(' · '),action:()=>openGuide(x)}))});
  if(tools.length)groups.push({title:'Araçlar',items:tools.map(([t,m,tab])=>({type:'Araç',title:t,meta:m,action:()=>openTool(tab)}))});
  return{query:q,total:groups.reduce((s,g)=>s+g.items.length,0),groups};
}
function openTool(tab){close();R.switch?.(tab)}
function openLog(id){close();R.edit?.(id);R.switch?.('log')}
function openMemory(kind,key){close();if(typeof R.openRadioMemory==='function')R.openRadioMemory(kind,key);else R.switch?.('memory')}
function openGuide(entry){close();R.switch?.('guide');setTimeout(()=>{const s=$('#guideSearch');if(s){s.value=entry.station||String(entry.frequency||'');s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))}R.renderGuide?.()},80)}
function makeResult(item){
  const b=document.createElement('button');b.type='button';b.className='v44-result';
  const type=document.createElement('span');type.className='v44-result-type';type.textContent=String(item.type??'');
  const body=document.createElement('div');const title=document.createElement('b');title.textContent=String(item.title??'');const meta=document.createElement('small');meta.textContent=String(item.meta??'');body.append(title,meta);
  const arrow=document.createElement('i');arrow.textContent='›';b.append(type,body,arrow);b.addEventListener('click',()=>item.action?.());return b;
}
function render(query,{submitted=false}={}){
  if(!results||!status)return;
  const data=searchData(query);results.replaceChildren();
  if(!data.query){status.textContent='İstasyon, frekans, ülke, dil, kayıt notu veya araç adı yaz.'}
  else if(data.total){status.textContent=`“${data.query}” için ${data.total} sonuç bulundu.`}
  else status.textContent=`“${data.query}” için sonuç bulunamadı.`;
  if(!data.total&&data.query){const empty=document.createElement('div');empty.className='v44-empty';const b=document.createElement('b');b.textContent='Sonuç bulunamadı';const s=document.createElement('span');s.textContent='Farklı bir istasyon adı, ülke, dil veya frekans dene.';empty.append(b,s);results.append(empty);return}
  for(const group of data.groups){const section=document.createElement('section');section.className='v44-group';const h=document.createElement('h3');h.textContent=group.title;section.append(h);for(const item of group.items)section.append(makeResult(item));results.append(section)}
  if(submitted)results.scrollTo?.({top:0,behavior:'smooth'});
}
function open(){
  loadCss();close();
  const overlay=document.createElement('div');overlay.id='v44SearchOverlay';overlay.className='v44-overlay';overlay.addEventListener('click',close);
  root=document.createElement('section');root.id='v44Search';root.className='v44-sheet';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','v44SearchTitle');
  const head=document.createElement('div');head.className='v44-head';const headText=document.createElement('div');const kicker=document.createElement('span');kicker.textContent='GLOBAL ARAMA';const title=document.createElement('h2');title.id='v44SearchTitle';title.textContent='Ne arıyorsun?';headText.append(kicker,title);const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='v44-close';closeBtn.setAttribute('aria-label','Aramayı kapat');closeBtn.textContent='×';closeBtn.addEventListener('click',close);head.append(headText,closeBtn);
  const form=document.createElement('form');form.className='v44-form';form.noValidate=true;
  const field=document.createElement('div');field.className='v44-field';const icon=document.createElement('span');icon.textContent='⌕';input=document.createElement('input');input.id='v44SearchInput';input.type='search';input.autocomplete='off';input.enterKeyHint='search';input.placeholder='Örn. Romanya, 17650, Fransızca…';input.setAttribute('aria-label','Global arama');const clear=document.createElement('button');clear.type='button';clear.className='v44-clear';clear.textContent='Temizle';clear.addEventListener('click',()=>{input.value='';render('');input.focus()});field.append(icon,input,clear);
  const submit=document.createElement('button');submit.type='submit';submit.className='v44-submit';submit.textContent='Ara';
  form.append(field,submit);
  status=document.createElement('div');status.id='v44SearchStatus';status.className='v44-status';status.setAttribute('aria-live','polite');
  results=document.createElement('div');results.id='v44SearchResults';results.className='v44-results';
  root.append(head,form,status,results);document.body.append(overlay,root);document.documentElement.classList.add('v44-search-open');
  form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(liveTimer);render(input.value,{submitted:true});input.blur()});
  input.addEventListener('input',()=>{clearTimeout(liveTimer);liveTimer=setTimeout(()=>render(input.value),120)});
  render('');setTimeout(()=>input?.focus(),80);
}
R.openGlobalSearch=()=>open();
R.v44SearchEngine=searchData;
window.addEventListener('click',e=>{
  const target=e.target instanceof Element?e.target.closest('[data-v42search],[data-v44search]'):null;
  if(!target)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root)close()});
loadCss();document.title=`Radyo Günlüğüm ${VERSION}`;const ver=document.querySelector('.topbar h1 span');if(ver)ver.textContent=VERSION;
})();