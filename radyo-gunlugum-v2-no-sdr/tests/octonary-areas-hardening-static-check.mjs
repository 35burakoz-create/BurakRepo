import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const home=read('app-home-ui.js');
const now=read('app-now-ui.js');
const density=read('app-page-density.js');
const tips=read('app-radio-tooltips.js');
const modal=read('app-modal-accessibility.js');
const bootstrap=read('app-bootstrap.js');

for(const [file,src] of [['app-home-ui.js',home],['app-now-ui.js',now],['app-page-density.js',density],['app-radio-tooltips.js',tips],['app-modal-accessibility.js',modal],['app-bootstrap.js',bootstrap]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

check('home dashboard explicitly filters foreign account rows',home.includes('function ownedLogs()')&&home.includes('x.user_id===userId'));
check('home candidate list rejects missing ids and invalid frequencies',home.includes('function validCandidate(e)')&&home.includes("String(id).trim()===''" )&&home.includes('!Number.isFinite(f)||f<=0'));
check('home malformed or missing scores are not fabricated',home.includes("if(raw===null||raw===undefined||raw==='')return null")&&home.includes('Number.isFinite(n)?Math.max(1,Math.min(99,Math.round(n))):null'));
check('home signal display is restricted to personal 1-5 scale',home.includes('function signalValue(value)')&&home.includes('n>=1&&n<=5'));
check('home rerenders immediately on account transition',home.includes("R.events?.on?.('auth:changed'"));
check('now candidate list rejects malformed entries',now.includes('function validCandidate(e)')&&now.includes('return(Array.isArray(rows)?rows:[]).filter(validCandidate)'));
check('now score has a finite fallback instead of NaN',now.includes('Number.isFinite(raw)?raw:50'));
check('now list exposes progressive results beyond 30 candidates',now.includes('let visibleLimit=30')&&now.includes('data-now-more')&&now.includes('visibleLimit+=30'));
check('now delegated clicks tolerate non-Element targets',now.includes('if(!(e.target instanceof Element))return'));
check('now pagination resets on account transition',now.includes("'auth:changed'")&&now.includes('visibleLimit=30'));
check('density telemetry isolates active account rows',density.includes('function ownedRows(rows)')&&density.includes('x.user_id===userId'));
check('density signal averages accept only values 1 through 5',density.includes('function validSignal(value)')&&density.includes('n>=1&&n<=5'));
check('density map telemetry validates coordinate ranges',density.includes('a>=-90&&a<=90')&&density.includes('b>=-180&&b<=180'));
check('density calendar requires real ISO dates and valid month keys',density.includes('function validIsoDate(value)')&&density.includes('function validMonthKey(value)')&&density.includes('String(x.date).slice(0,7)===key'));
check('density band summaries reject receiver-unsupported bands',density.includes('function supportedBand(value)')&&density.includes('!!bands[b]'));
check('density guide summary follows calculated broadcast season',density.includes('R.radioIntelligence?.seasonFor?.(today())'));
check('density rerenders immediately on account transition',density.includes("R.events?.on?.('auth:changed'"));
check('tooltip adds and removes only its aria-describedby token',tips.includes('function describedByAdd(el)')&&tips.includes('function describedByRemove(el)')&&tips.includes('x!==TIP_ID'));
check('tooltip restores owned tabindex and preserved native titles',tips.includes('function restoreOwnedState()')&&tips.includes("[data-radio-tooltip-tabindex]")&&tips.includes("[data-radio-native-title]"));
check('tooltip closes if its active anchor disappears',tips.includes('!active.isConnected||!termFor(active)'));
check('tooltip closes on authenticated account transitions',tips.includes("R.events?.on?.('auth:changed'"));
check('modal layer knows how to close the full glossary dialog',modal.includes("dialog.id==='appRadioGlossaryModal'")&&modal.includes('R.radioGlossary?.close?.()'));
check('route transitions close glossary and tooltip overlays',modal.includes("R.events?.on?.('route:before'")&&modal.includes('R.radioTooltips?.hide?.({force:true})')&&modal.includes("R.radioGlossary?.close?.({focus:false})"));
check('bootstrap module loads have an explicit timeout',bootstrap.includes('MODULE_TIMEOUT_MS=12000')&&bootstrap.includes('Modül yükleme zaman aşımı'));
check('bootstrap settles each script only once and removes listeners',bootstrap.includes('let settled=false')&&bootstrap.includes('if(settled)return')&&bootstrap.includes("removeEventListener?.('load',done)"));
check('bootstrap fails fast when a critical module fails',bootstrap.includes('if(CRITICAL.has(src))')&&bootstrap.includes("'bootstrap:failed'"));
check('bootstrap concurrent run calls are coalesced',bootstrap.includes('if(runFlight)return runFlight')&&bootstrap.includes('runFlight=(async()=>'));

// Functional home helper checks.
{
  const tab={},rootEl={innerHTML:''};
  const R={
    me:{id:'u1'},logs:[
      {id:'a',user_id:'u1',date:'2026-09-14',signal_strength:5,country:'Türkiye'},
      {id:'b',user_id:'u2',date:'2026-09-14',signal_strength:4,country:'Çin'},
      {id:'c',date:'2026-09-13',signal_strength:1,country:'Almanya'}
    ],
    radioNowCandidates(){return[
      {id:'ok',mode:'SW',band:'SW3',frequency:6000,probability_score:'bad'},
      {id:'zero',mode:'SW',band:'SW3',frequency:0},
      {id:null,mode:'SW',band:'SW3',frequency:6010},
      {id:'unsupported',mode:'SW',band:'SW99',frequency:6020}
    ]},
    currentPrograms:{receiverCompatible:e=>e.band!=='SW99'},
    events:{on(){}},router:{register(){},current(){return'home'}},features:{register(){}},clock:{today:()=> '2026-09-14'}
  };
  const document={hidden:false,querySelector:s=>s==='#tab-home'?tab:s==='#v38Home'?rootEl:null,createElement:()=>({}),addEventListener(){}};
  const sandbox={window:{R},document,globalThis:null,RADIO_APP_CONFIG:{receiver:{bands:{SW3:{min:5950,max:6200}}}},Intl,Date,Math,Number,String,Array,Object,Map,Set,JSON,localStorage:{getItem(){return null}},console,setTimeout:()=>1,clearTimeout(){}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(home,sandbox,{filename:'app-home-ui.js'});
  check('functional home ownership filter excludes foreign row while keeping ownerless legacy row',R.homeUI.ownedLogs().length===2);
  check('functional home candidate filter leaves only valid receiver entry',R.homeUI.candidates('ALL').length===1&&R.homeUI.candidates('ALL')[0].id==='ok');
  check('functional home malformed score remains unknown instead of becoming 50',R.homeUI.score({probability_score:'bad'})===null);
  check('functional home signal helper rejects corrupt 99/5 value',R.homeUI.signalValue(99)===null&&R.homeUI.signalValue(5)===5);
  check('functional home date helper rejects impossible day',R.homeUI.validIsoDate('2026-02-30')===false&&R.homeUI.validIsoDate('2024-02-29')===true);
}

// Functional current-candidate pagination and malformed score checks.
{
  class Element{constructor(fn=()=>null){this.fn=fn}closest(sel){return this.fn(sel)}}
  const tab={},rootEl={innerHTML:''};let clickHandler=null;
  const rows=Array.from({length:35},(_,i)=>({id:`r${i}`,mode:'SW',band:'SW3',frequency:6000+i,station:`İstasyon ${i}`,probability_score:i===0?'bad':60}));
  const R={radioNowCandidates:()=>rows,currentPrograms:{receiverCompatible:()=>true},events:{on(){}},router:{register(){},current(){return'now'}},features:{register(){}},clock:{format:()=> '14 Eylül 2026 12:00',today:()=> '2026-09-14',time:()=> '12:00'},guideService:{currentWindowText:()=>''},uiState:{}};
  const document={querySelector:s=>s==='#tab-now'?tab:s==='#v38Now'?rootEl:null,createElement:()=>({}),addEventListener:(name,fn)=>{if(name==='click')clickHandler=fn}};
  const sandbox={window:{R},document,Element,globalThis:null,RADIO_APP_CONFIG:{origin:{name:'Bozköy'},receiver:{bands:{SW3:{min:5950,max:6200}}}},Intl,Date,Math,Number,String,Array,Object,Map,Set,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(now,sandbox,{filename:'app-now-ui.js'});
  R.nowUI.render();
  check('functional now initial render shows first 30 with five remaining',R.nowUI.visibleLimit===30&&rootEl.innerHTML.includes('5 adayı daha göster'));
  check('functional now malformed score falls back to 50',R.nowUI.score({probability_score:'nope'})===50);
  const target=new Element(sel=>sel==='[data-now-more]'?{}:null);clickHandler?.({target});
  check('functional now more action expands result window',R.nowUI.visibleLimit===60&&!rootEl.innerHTML.includes('data-now-more'));
}

// Functional page-density validation helpers.
{
  const links=[];
  const R={me:{id:'u1'},logs:[{user_id:'u1',signal_strength:1,band:'SW3'},{user_id:'u1',signal_strength:5,band:'SW3'},{user_id:'u1',signal_strength:99,band:'SW3'},{user_id:'u2',signal_strength:3,band:'MW'}],events:{on(){}},router:{current(){return'analysis'}},features:{register(){}},clock:{today:()=> '2026-09-14',parts:()=>({monthKey:'2026-09'})}};
  const document={querySelector:s=>s==='#calendarMonth'?null:null,querySelectorAll:()=>[],createElement:()=>({dataset:{}}),head:{appendChild:x=>links.push(x)},addEventListener(){}};
  const sandbox={window:{R},document,globalThis:null,RADIO_APP_CONFIG:{receiver:{bands:{FM:{},MW:{},SW3:{}}}},Intl,Date,Math,Number,String,Array,Object,Map,Set,console,setTimeout:()=>0,clearTimeout(){}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(density,sandbox,{filename:'app-page-density.js'});
  check('functional density ownership filter excludes foreign row',R.pageDensity.logs().length===3);
  check('functional density average ignores corrupt signal values',R.pageDensity.avgSignal(R.pageDensity.logs())==='3.0');
  check('functional density coordinates accept edge and reject overflow',R.pageDensity.validCoords(90,180)&&!R.pageDensity.validCoords(90.01,0)&&!R.pageDensity.validCoords(0,180.01));
  check('functional density date validator rejects normalized impossible date',!R.pageDensity.validIsoDate('2026-02-30')&&R.pageDensity.validIsoDate('2024-02-29'));
  check('functional density month validator rejects month 13',R.pageDensity.validMonthKey('2026-09')&&!R.pageDensity.validMonthKey('2026-13'));
  check('functional density receiver band filter rejects SW99',R.pageDensity.supportedBand('SW3')==='SW3'&&R.pageDensity.supportedBand('SW99')==='');
}

// Functional aria-describedby and cleanup ownership checks.
{
  class Node{
    constructor(){this.attrs=new Map();this.dataset={};this.hidden=false;this.isConnected=true}
    getAttribute(k){return this.attrs.has(k)?this.attrs.get(k):null}
    setAttribute(k,v){this.attrs.set(k,String(v))}
    removeAttribute(k){this.attrs.delete(k)}
    hasAttribute(k){return this.attrs.has(k)}
    matches(){return false}
  }
  const staleTab=new Node();staleTab.setAttribute('tabindex','0');staleTab.dataset.radioTooltipTabindex='1';
  const staleTitle=new Node();staleTitle.dataset.radioNativeTitle='Özgün başlık';
  const R={radioGlossary:{terms:{}},events:{on(){}},features:{register(){}}};
  const document={querySelector:()=>null,querySelectorAll:sel=>sel==='[data-radio-tooltip-tabindex]'?[staleTab]:sel==='[data-radio-native-title]'?[staleTitle]:[],addEventListener(){},body:{appendChild(){}}};
  const sandbox={window:{R,addEventListener(){},innerWidth:1000,innerHeight:800},document,globalThis:null,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},Math,Number,String,Array,Object,Map,Set,console};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(tips,sandbox,{filename:'app-radio-tooltips.js'});
  const el=new Node();el.setAttribute('aria-describedby','existing-help');
  R.radioTooltips.describedByAdd(el);
  check('functional tooltip keeps existing aria-describedby when adding itself',el.getAttribute('aria-describedby')==='existing-help appRadioTermTooltip');
  R.radioTooltips.describedByRemove(el);
  check('functional tooltip removes only its own aria-describedby token',el.getAttribute('aria-describedby')==='existing-help');
  R.radioTooltips.restoreOwnedState();
  check('functional tooltip removes stale tabindex that it owned',!staleTab.hasAttribute('tabindex')&&staleTab.dataset.radioTooltipTabindex===undefined);
  check('functional tooltip restores preserved native title after annotation disappears',staleTitle.getAttribute('title')==='Özgün başlık'&&staleTitle.dataset.radioNativeTitle===undefined);
}

// Functional bootstrap timeout and load-flight coalescing checks.
{
  const noAuto=bootstrap.replace("run().catch(error=>console.error('[bootstrap-fatal]',error));",'');
  check('bootstrap test can disable automatic startup without changing implementation',noAuto!==bootstrap);
  class Script{
    constructor(doc){this.doc=doc;this.dataset={};this.listeners={};this.src='';this.isConnected=false;this.async=true}
    addEventListener(name,fn){this.listeners[name]=fn}
    removeEventListener(name,fn){if(this.listeners[name]===fn)delete this.listeners[name]}
    fire(name){this.listeners[name]?.()}
    remove(){this.isConnected=false;const i=this.doc.scripts.indexOf(this);if(i>=0)this.doc.scripts.splice(i,1)}
  }
  const document={scripts:[],querySelector:()=>null,createElement(tag){return tag==='script'?new Script(this):{dataset:{},style:{},setAttribute(){},append(){},focus(){}}},head:{appendChild(){}},body:{appendChild(s){s.isConnected=true;document.scripts.push(s);document.lastScript=s}}};
  const R={events:{emit(){}},reportError(){}};
  const sandbox={window:{R},document,location:{reload(){}},console,Error,Promise,Set,Map,Math,Number,String,Array,Object,setTimeout,clearTimeout};
  vm.createContext(sandbox);vm.runInContext(noAuto,sandbox,{filename:'app-bootstrap.js'});
  let timeoutError=null;const hungPromise=R.bootstrap.load('hung-test.js',{timeoutMs:5}),hung=document.lastScript;try{await hungPromise}catch(e){timeoutError=e}
  check('functional bootstrap rejects a hung module on timeout',String(timeoutError?.message||'').includes('zaman aşımı'));
  check('functional bootstrap clears timed-out load flight and records failure',!R.bootstrap.loading.has('hung-test.js')&&R.bootstrap.failed.has('hung-test.js'));
  hung.fire('load');
  check('functional bootstrap ignores late load after timeout',!R.bootstrap.loaded.has('hung-test.js'));
  const p1=R.bootstrap.load('slow-test.js',{timeoutMs:100}),p2=R.bootstrap.load('slow-test.js',{timeoutMs:100}),slow=document.lastScript;
  check('functional bootstrap coalesces duplicate module load calls',p1===p2);
  slow.fire('load');await p1;
  check('functional bootstrap successful retry path clears failure state',R.bootstrap.loaded.has('slow-test.js')&&!R.bootstrap.failed.has('slow-test.js')&&!R.bootstrap.loading.has('slow-test.js'));
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} octonary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));