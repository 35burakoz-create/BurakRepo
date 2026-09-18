import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const index=read('index.html');
const boot=read('app-bootstrap.js');
const router=read('app-router-core.js');
const state=read('app-ui-state.js');
const config=read('app-config.js');
const sw=read('sw.js');

check('static journal starts hidden',/id="tab-log" class="tab-view hidden"/.test(index));
check('journal tab is not statically active',!/<button class="main-tab active" data-tab="log">/.test(index));
check('no static tab-view is initially visible',![...index.matchAll(/<section id="tab-[^"]+" class="([^"]*tab-view[^"]*)"/g)].some(x=>!x[1].split(/\s+/).includes('hidden')));
check('UI state loads before authenticated UI',boot.indexOf("'app-ui-state.js'")>boot.indexOf("'app-router-core.js'")&&boot.indexOf("'app-ui-state.js'")<boot.indexOf("'app-auth-ui.js'"));
check('router defaults to home rather than visible markup',router.includes("let current=hashRoute()||'home'")&&!router.includes("let current=hashRoute()||R.uiState?.tab||visibleRoute()||'home'"));
check('router can stage any known route before its UI module loads',router.includes("if(!document.getElementById(`tab-${route}`))ensureTab(route)"));
check('UI state is scoped to the authenticated user',state.includes("STATE_KEY='radio-ui-state-v40'")&&state.includes('`${STATE_KEY}:${userId}`'));
check('empty URL restores the last valid account route',state.includes("state.tab=hash||(VALID.has(saved.tab)?saved.tab:'home')"));
check('invalid persisted routes still fall back to home',state.includes("VALID.has(saved.tab)?saved.tab:'home'"));
check('malformed URL hashes fail closed instead of throwing',state.includes("catch(error){R.reportError?.(error,'ui-state-hash',{silent:true});return null}"));
check('UI state exports its canonical hash parser for regression checks',state.includes('resetScroll,readHash}'));
check('legacy boot redirect guard removed',!state.includes('bootGuardUntil'));
check('route restore does not depend on appView visibility',state.includes("restore(){if(!R.me)return null;")&&!state.includes("$('#appView')?.classList.contains('hidden')"));
check('authenticated session loads account state before restoring route',state.includes('applyStoredState(nextId);restoreFilters();restoreDraft();R.navigation.restore()'));
check('route is re-entered after all modules register',state.includes('applyStoredState(R.me.id);restoreFilters();R.navigation.restore()'));
check('slow fallback timer removed',!state.includes('3900')&&!state.includes('setTimeout(()=>{bootGuardUntil'));
check('route fix has a non-legacy PWA cache identity',/cacheVersion:'v385-core-boundary-(?!20260907-1)[^']+'/.test(config));
check('service worker navigation remains network first',sw.includes("if(req.mode==='navigate')")&&sw.includes("fetch(req,{cache:'no-store'})"));

// Functional malformed-hash regression: a broken percent escape must not prevent UI state from booting.
{
  const reports=[];
  const R={me:null,events:{on(){}},features:{register(){}},reportError:(error,source)=>reports.push({error,source}),router:{current:()=> 'home'}};
  const document={querySelector(){return null},getElementById(){return null},addEventListener(){},visibilityState:'visible'};
  const localStorage={getItem(){return null},setItem(){},removeItem(){}};
  const location={hash:'#tab=%E0%A4%A',href:'https://app.example/#tab=%E0%A4%A'};
  const history={pushState(){},replaceState(){}};
  const window={R,addEventListener(){},scrollTo(){}};
  const sandbox={window,R,document,localStorage,location,history,URL,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  vm.createContext(sandbox);
  let threw=false;try{vm.runInContext(state,sandbox,{filename:'app-ui-state.js'})}catch{threw=true}
  check('UI state boots successfully with malformed encoded hash',!threw&&R.uiState?.tab==='home');
  check('malformed encoded hash is reported for diagnostics',reports.some(x=>x.source==='ui-state-hash'));
  location.hash='#tab=now';
  check('valid hash still parses after malformed hash recovery',R.uiStatePersistence?.readHash?.()==='now');
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(x=>!x[1]);
console.log(`\n${checks.length-failed.length}/${checks.length} refresh-routing checks passed.`);
if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));
