import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const now=fs.readFileSync(path.join(root,'app-now-ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app-audit-polish.css'),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

let syntax=true,syntaxDetail='';
try{new vm.Script(now,{filename:'app-now-ui.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('now module syntax',syntax,syntaxDetail);

check('current view fallback label uses configured timezone',now.includes("TZ=C.timezone||'Europe/Istanbul'")&&now.includes('timeZone:TZ'));
check('displayed score does not invent fifty points',now.includes('function displayScore(e)')&&now.includes("if(raw===null||raw===undefined||raw==='')return null")&&now.includes('const s=displayScore(e)'));
check('unknown displayed score is labeled explicitly',now.includes('data-score-unknown')&&now.includes('Puan yok'));
check('canonical empty candidate set does not fall through to legacy suggestions',now.includes("if(typeof R.radioNowCandidates==='function')")&&now.includes("return(Array.isArray(rows)?rows:[]).filter(validCandidate)"));
check('legacy suggestion fallback remains available only without canonical provider',now.includes('R.currentSuggestions?.()||[]'));
check('current view distinguishes guide loading from true empty results',now.includes('Yayın rehberi hazırlanıyor')&&now.includes('Şu anda dinlemeye uygun bir yayın adayı yok.'));
check('band-specific empty state names the selected band',now.includes('`${m} bandında şu anda dinlemeye uygun bir yayın adayı yok.`'));
check('current view refreshes on minute boundaries',now.includes('60000-(Date.now()%60000)+75')&&now.includes('function scheduleMinuteRefresh()'));
check('current minute refresh is route scoped and hidden-document aware',now.includes("R.router?.current?.()!=='now'||document.hidden")&&now.includes("R.router?.current?.()==='now'&&!document.hidden"));
check('leaving current view stops its minute timer',now.includes("else if(x?.from==='now')stopMinuteRefresh()"));
check('visibility resume refreshes stale current data',now.includes("document.addEventListener('visibilitychange'")&&now.includes('render();scheduleMinuteRefresh()'));
check('guide readiness directly rerenders current view',now.includes("R.events?.on?.('guide:data-ready'"));
check('event-driven rerenders are coalesced',now.includes('renderTimer')&&now.includes('function scheduleRender('));
check('account and origin changes reset progressive pagination',now.includes("'auth:changed'")&&now.includes("'user:settings'")&&now.includes('resetLimit:true'));
check('filter buttons expose pressed state and button type',now.includes('role="group" aria-label="Yayın bandı filtresi"')&&now.includes('aria-pressed="${m===x?\'true\':\'false\'}"')&&now.includes('<button type="button" class="${m===x?'));
check('candidate action buttons are non-submit controls',now.includes('<button type="button" class="btn primary" data-listen=')&&now.includes('<button type="button" class="btn ghost" data-prefill='));
check('source labels remove control whitespace before display',now.includes('function cleanSource(value)')&&now.includes("replace(/[\\u0000-\\u001f\\u007f-\\u009f]+/g,' ')"));
check('language display falls back to generic language field',now.includes('e?.language_content||e?.language||'));
check('empty and more rows span the full desktop grid',css.includes('#v38Now .v38-list>.v38-empty,#v38Now .v38-list>[data-now-more]{grid-column:1/-1}'));
check('current filter row uses four stable equal columns',css.includes('#v38Now .v38-filters{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))'));
check('current primary controls meet touch target height',css.includes('#v38Now .v38-nowhead .btn,#v38Now .v38-filters button,#v38Now .v38-itemactions .btn,#v38Now [data-now-more]{min-height:44px}'));
check('current score microcopy is raised to readable size',css.includes('#v38Now .v42-quality-label{font-size:10px!important'));
check('current quality states have distinct visual treatments',css.includes('[data-quality="good"] .v38-score')&&css.includes('[data-quality="mid"] .v38-score')&&css.includes('[data-quality="low"] .v38-score')&&css.includes('[data-quality="unknown"] .v38-score'));
check('current detail disclosure has a full touch row and affordance',css.includes('#v38Now .v38-item details summary{display:flex')&&css.includes('min-height:44px')&&css.includes('summary:after'));
check('current night mode covers filters scores and empty state',css.includes('.night-mode #v38Now .v38-filters button')&&css.includes('.night-mode #v38Now .v38-item[data-quality="unknown"] .v38-score')&&css.includes('.night-mode #v38Now .v42-state'));
check('narrow current header stacks actions safely',css.includes('@media(max-width:520px)')&&css.includes('#v38Now .v38-nowhead{flex-direction:column'));
check('very narrow candidate actions can stack',css.includes('@media(max-width:360px)')&&css.includes('#v38Now .v38-itemactions .btn{flex:1 1 100%}'));
check('current disclosure motion respects reduced-motion preference',css.includes('#v38Now .v38-item details summary:after{transition:none!important}'));
check('current section does not clip card shadows or focus rings',css.includes('#v38Now .v38-section{overflow:visible}'));
check('current frequency remains intact on one line',css.includes('#v38Now .v38-item .freq{overflow-wrap:normal!important;white-space:nowrap')&&css.includes('font-size:clamp(24px,3.3vw,29px)!important'));
check('current candidate actions use readable balanced labels',css.includes('#v38Now .v38-itemactions .btn{flex:1 1 0;min-width:0;font-size:11.5px!important'));
check('current quality microcopy inherits its state color',css.includes('color:currentColor!important;opacity:.82'));
check('current grid does not stretch shorter cards',css.includes('#v38Now .v38-list{align-items:start!important}'));
check('current more action has a distinct full-width treatment',css.includes('#v38Now [data-now-more]{width:100%;margin-top:2px;font-size:12px!important;background:#f8fafc!important;border-style:dashed!important}'));
check('current night mode removes the light section gradient',css.includes('.night-mode #v38Now .v38-section,html.night #v38Now .v38-section{background:#111827!important;background-image:none!important}'));
check('current night mode keeps frequency text bright',css.includes('.night-mode #v38Now .v38-item .freq,html.night #v38Now .v38-item .freq{color:#f8fafc!important}'));
check('current night mode keeps disclosure text and divider readable',css.includes('.night-mode #v38Now .v38-item details,html.night #v38Now .v38-item details{border-color:#334155!important}')&&css.includes('.night-mode #v38Now .v38-item details summary,.night-mode #v38Now .v38-detail'));
check('narrow current cards tighten section padding without crushing content',css.includes('@media(max-width:430px)')&&css.includes('#v38Now .v38-section{padding:14px!important}')&&css.includes('#v38Now .v38-item{padding:14px!important}'));

class Element{
  constructor(fn=()=>null){this.fn=fn}
  closest(selector){return this.fn(selector)}
}
const tab={},rootEl={innerHTML:''};
const eventHandlers=new Map(),documentHandlers=new Map();
let currentRoute='now',timerSeq=0;
const timers=new Map(),cleared=[];
let fallbackCalls=0;
const validRow={id:'g1',mode:'SW',band:'SW3',frequency:6000,station:'Test Radyo',language_content:'Türkçe',country:'Türkiye',_score:82,time_text:'12:00–13:00'};
const R={
  guideEntries:[validRow],uiState:{nowMode:'ALL'},
  radioNowCandidates:()=>[],
  currentSuggestions(){fallbackCalls+=1;return[validRow]},
  currentPrograms:{receiverCompatible:e=>e.band!=='SW99'},
  clock:{format:()=> '14 Eylül Pazartesi 16:20',today:()=> '2026-09-14',time:()=> '16:20'},
  listeningOrigin:()=>({name:'Bozköy, Torbalı, İzmir'}),
  guideService:{currentWindowText:e=>e.time_text||''},
  router:{current:()=>currentRoute,register(){}},
  events:{on(name,fn){if(!eventHandlers.has(name))eventHandlers.set(name,[]);eventHandlers.get(name).push(fn)}},
  features:{register(){}},reportError(){}
};
const document={
  hidden:false,
  querySelector(selector){if(selector==='#tab-now')return tab;if(selector==='#v38Now')return rootEl;return null},
  createElement(){throw new Error('Unexpected DOM creation in now test')},
  addEventListener(name,fn){if(!documentHandlers.has(name))documentHandlers.set(name,[]);documentHandlers.get(name).push(fn)}
};
const sandbox={
  window:{R},document,Element,globalThis:null,
  RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir'},receiver:{bands:{FM:{min:76,max:108},MW:{min:525,max:1610},SW3:{min:5950,max:6200}}}},
  Intl,Date,Math,Number,String,Array,Object,Map,Set,Error,console,
  setTimeout(fn){timerSeq+=1;timers.set(timerSeq,fn);return timerSeq},
  clearTimeout(id){cleared.push(id);timers.delete(id)}
};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(now,sandbox,{filename:'app-now-ui.js'});
const N=R.nowUI;

check('canonical empty results stay empty instead of using fallback suggestions',N.candidates('ALL').length===0&&fallbackCalls===0);
delete R.radioNowCandidates;
check('legacy fallback still works when canonical provider is absent',N.candidates('ALL').length===1&&fallbackCalls===1);
R.radioNowCandidates=()=>[validRow,{id:'bad-zero',mode:'SW',band:'SW3',frequency:0},{id:'bad-band',mode:'SW',band:'SW99',frequency:6020},{id:null,mode:'SW',band:'SW3',frequency:6010}];
check('current candidate validation keeps only usable receiver rows',N.candidates('ALL').length===1&&N.candidates('ALL')[0].id==='g1');
check('display score preserves a real score',N.displayScore({_score:82})===82);
check('display score rejects missing and malformed evidence',N.displayScore({})===null&&N.displayScore({probability_score:'bad'})===null);
check('display score clamps excessive explicit values safely',N.displayScore({_score:120})===99);
check('quality labels unknown evidence without pretending weakness',N.quality(null)==='Puan yok');

R.guideEntries=[];R.radioNowCandidates=()=>[];N.render();
check('guide-loading state is rendered while guide data is unavailable',rootEl.innerHTML.includes('Yayın rehberi hazırlanıyor')&&!rootEl.innerHTML.includes('Şu anda dinlemeye uygun bir yayın adayı yok.'));
R.guideEntries=[validRow];N.render();
check('true empty state appears after guide becomes ready',rootEl.innerHTML.includes('Şu anda dinlemeye uygun bir yayın adayı yok.'));
R.uiState.nowMode='SW';N.render();
check('band empty state identifies SW filter',rootEl.innerHTML.includes('SW bandında şu anda dinlemeye uygun'));

const unknownRow={...validRow,id:'unknown',_score:undefined,probability_score:'bad',source_doc:'EiBi\u000bA26  '};
R.uiState.nowMode='ALL';R.radioNowCandidates=()=>[unknownRow];N.render();
check('rendered malformed score is shown as unknown, not fifty',rootEl.innerHTML.includes('Puan yok')&&!rootEl.innerHTML.includes('50/99'));
check('rendered source control whitespace is cleaned',rootEl.innerHTML.includes('Kaynak: EiBi A26')&&!rootEl.innerHTML.includes('\u000b'));
check('filter markup exposes accessible pressed state',rootEl.innerHTML.includes('aria-pressed="true"')&&rootEl.innerHTML.includes('aria-label="Yayın bandı filtresi"'));

const many=Array.from({length:35},(_,i)=>({...validRow,id:`r${i}`,frequency:6000+i,_score:60}));
R.radioNowCandidates=()=>many;N.render();
check('current view initially limits a large candidate set to thirty',N.visibleLimit===30&&rootEl.innerHTML.includes('5 adayı daha göster'));
const clickHandler=documentHandlers.get('click')?.[0];
clickHandler?.({target:new Element(sel=>sel==='[data-now-more]'?{}:null)});
check('more action expands the current candidate window',N.visibleLimit===60&&!rootEl.innerHTML.includes('data-now-more'));
currentRoute='home';for(const fn of eventHandlers.get('auth:changed')||[])fn({authenticated:true});
check('account transition resets pagination even while current view is inactive',N.visibleLimit===30);

currentRoute='now';document.hidden=false;N.scheduleMinuteRefresh();
const minuteId=Math.max(...timers.keys());
currentRoute='home';for(const fn of eventHandlers.get('route:changed')||[])fn({from:'now',to:'home'});
check('route departure clears current minute refresh',cleared.includes(minuteId));
const beforeHidden=timerSeq;currentRoute='now';document.hidden=true;N.scheduleMinuteRefresh();
check('hidden current view does not schedule a minute timer',timerSeq===beforeHidden);
document.hidden=false;

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} current-view hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
