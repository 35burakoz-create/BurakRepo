import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const source=fs.readFileSync(path.join(root,'app-home-ui.js'),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

let syntax=true,syntaxDetail='';
try{new vm.Script(source,{filename:'app-home-ui.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('home module syntax',syntax,syntaxDetail);

check('home clock fallback uses configured application timezone',source.includes("TZ=C.timezone||'Europe/Istanbul'")&&source.includes('timeZone:TZ'));
check('home validates full legacy clock values',source.includes('function validTime(value)')&&source.includes('min>=0&&min<=59')&&source.includes('sec>=0&&sec<=59'));
check('home does not invent a neutral score for missing candidate score',!source.includes('e?.probability_score??50')&&source.includes("if(raw===null||raw===undefined||raw==='')return null"));
check('home distinguishes guide loading from a real no-candidate state',source.includes('Yayın rehberi henüz hazır değil')&&source.includes('Şu anda dinlemeye uygun bir yayın adayı yok'));
check('home weekly activity indexes dates once',source.includes('counts=new Map()')&&source.includes("counts.set(x.date,(counts.get(x.date)||0)+1)"));
check('zero-listening days render a zero-height bar',source.includes('x.count?Math.max(8,Math.round(x.count/max*100)):0'));
check('home dial omits needle when no band is selected',source.includes("return i<0?null")&&source.includes("Number.isFinite(pos)?`<i class=\"v42-radio-needle\""));
check('home latest record is derived instead of trusting array position',source.includes('function latestLog(')&&!source.includes('last=logs[0]'));
check('home streak has no one-year hard cap',!source.includes('i<366')&&source.includes('n<set.size'));
check('home minute refresh is route scoped',source.includes("R.router?.current?.()!=='home'")&&source.includes('60000-(Date.now()%60000)'));
check('home stops minute refresh after leaving route',source.includes("else if(x?.from==='home')stopMinuteRefresh()"));
check('home pauses minute refresh while document is hidden',source.includes('document.hidden')&&source.includes("document.addEventListener('visibilitychange'"));
check('home coalesces event-driven rerenders',source.includes('renderTimer')&&source.includes('function scheduleRender('));
check('home listens for guide readiness explicitly',source.includes("R.events?.on?.('guide:data-ready'"));
check('home alternate candidates expose descriptive accessible labels',source.includes('aria-label=\"Dinlemeye başla:'));
check('home week bars expose record-count accessible labels',source.includes('aria-label=\"${esc(`${x.date}: ${x.count} kayıt`)}\"'));
check('home dial accessibility explains empty selection',source.includes('seçili yayın adayı yok'));
check('home last record shows frequency unit',source.includes("const b=String(x?.band||'').trim(),u=b==='FM'?'MHz':'kHz'"));

const dom={
  tab:{id:'tab-home',className:'tab-view'},
  home:{id:'v38Home',className:'v38-home',innerHTML:''}
};
const eventHandlers=new Map();
let currentRoute='home',timerSeq=0,clearedTimers=[];
const R={
  me:{id:'u1'},logs:[],guideEntries:[],
  norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),
  esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  clock:{
    today:()=> '2026-09-14',
    parts:()=>({date:'2026-09-14',hour:12,minute:34,second:0}),
    format:()=> '14 Eylül Pazartesi 12:34'
  },
  currentPrograms:{receiverCompatible:()=>true},
  radioNowCandidates:()=>[],currentSuggestions:()=>[],
  listeningOrigin:()=>({name:'Bozköy, Torbalı, İzmir'}),
  router:{current:()=>currentRoute,register(){}},
  events:{on(name,fn){if(!eventHandlers.has(name))eventHandlers.set(name,[]);eventHandlers.get(name).push(fn)}},
  features:{register(){}},
};
const document={
  hidden:false,
  querySelector(selector){if(selector==='#tab-home')return dom.tab;if(selector==='#v38Home')return dom.home;return null},
  createElement(){throw new Error('Unexpected DOM creation in home test')},
  addEventListener(){},
};
const localStorage={getItem(){return null}};
const sandbox={
  window:{R},globalThis:null,RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir'},receiver:{bands:{FM:{min:76,max:108},MW:{min:525,max:1610},SW9:{min:17550,max:17900}}}},
  document,localStorage,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,
  setTimeout(){timerSeq+=1;return timerSeq},clearTimeout(id){clearedTimers.push(id)}
};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'app-home-ui.js'});
const H=R.homeUI;

check('home accepts a real leap day',H.validIsoDate('2024-02-29')===true);
check('home rejects an impossible calendar date',H.validIsoDate('2026-02-29')===false);
check('home accepts a normal clock value',H.validTime('23:59')===true);
check('home rejects invalid minutes',H.validTime('03:99')===false);
check('home rejects invalid seconds',H.validTime('03:40:99')===false);
check('home preserves an explicit candidate score',H.score({_score:82})===82);
check('home returns no score when scoring evidence is missing',H.score({})===null);
check('home clamps an excessive explicit score safely',H.score({_score:120})===99);
check('home rejects a candidate without a usable id',H.validCandidate({mode:'SW',band:'SW9',frequency:17650})===false);
check('home accepts a compatible candidate with id and frequency',H.validCandidate({id:'g1',mode:'SW',band:'SW9',frequency:17650})===true);
check('home has no dial position when no candidate is selected',H.dialPosition(null)===null);
check('home resolves a real receiver band to a dial position',Number.isFinite(H.dialPosition({mode:'SW',band:'SW9'})));

R.logs=[
  {id:'3',user_id:'u1',date:'2026-09-13',time:'23:59',station:'Dün'},
  {id:'1',user_id:'u1',date:'2026-09-14',time:'08:15',station:'Sabah'},
  {id:'2',user_id:'u1',date:'2026-09-14',time:'18:30',station:'Akşam'},
  {id:'bad',user_id:'u1',date:'2026-02-30',time:'23:59',station:'Bozuk'},
  {id:'foreign',user_id:'u2',date:'2026-09-14',time:'23:59',station:'Yabancı hesap'}
];
check('home excludes explicitly foreign account logs',H.ownedLogs().every(x=>x.user_id!=='u2'));
check('home latest record ignores input ordering and invalid dates',H.latestLog(H.ownedLogs())?.id==='2');

const longRun=[];
for(let i=0;i<400;i++){
  const d=new Date('2026-09-14T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);
  longRun.push({id:String(i),user_id:'u1',date:d.toISOString().slice(0,10),time:'12:00'});
}
check('home streak supports more than one year',H.streak(longRun)===400);
const yesterdayRun=longRun.slice(1,6);
check('home streak can continue from yesterday when today has no record',H.streak(yesterdayRun)===5);

const weekHtml=H.weekActivity([{user_id:'u1',date:'2026-09-14'},{user_id:'u1',date:'2026-09-14'}]);
check('home weekly summary totals records correctly',weekHtml.includes('2 kayıt'));
check('home zero days have no false visible activity height',weekHtml.includes('height:0%'));
check('home active day still has visible activity height',weekHtml.includes('height:100%'));

R.logs=[];R.guideEntries=[];R.radioNowCandidates=()=>[];R.currentSuggestions=()=>[];
H.render();
check('home renders loading-state copy while guide is unavailable',dom.home.innerHTML.includes('Yayın rehberi henüz hazır değil'));
check('home renders no phantom dial needle without a candidate',!dom.home.innerHTML.includes('v42-radio-needle'));

R.guideEntries=[{id:'g0',entry_type:'station_target'}];
H.render();
check('home renders true no-candidate copy after guide is ready',dom.home.innerHTML.includes('Şu anda dinlemeye uygun bir yayın adayı yok'));

const candidate={id:'g1',mode:'SW',band:'SW9',frequency:17650,station:'Test Radyo',language_content:'Türkçe',time_text:'12:00–13:00'};
R.guideEntries=[candidate];R.radioNowCandidates=()=>[candidate];
H.render();
check('home does not fabricate 50-point quality for an unscored candidate',dom.home.innerHTML.includes('Puan yok')&&!dom.home.innerHTML.includes('50 puan'));
check('home renders a dial needle when an actual candidate exists',dom.home.innerHTML.includes('v42-radio-needle'));
check('home selected candidate dial announces its band',dom.home.innerHTML.includes('seçili bant SW9'));

clearedTimers=[];currentRoute='home';H.scheduleMinuteRefresh();
const scheduledId=timerSeq;
currentRoute='now';for(const fn of eventHandlers.get('route:changed')||[])fn({from:'home',to:'now'});
check('leaving home clears the scheduled minute refresh',clearedTimers.includes(scheduledId));

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} home-page hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
