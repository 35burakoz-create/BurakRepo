import fs from 'node:fs';
import path from 'node:path';

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
check('empty URL ignores stale persisted route',state.includes("const state={tab:readHash()||'home'")&&!state.includes("readHash()||old.tab||'home'"));
check('legacy boot redirect guard removed',!state.includes('bootGuardUntil'));
check('route restore does not depend on appView visibility',state.includes("restore(){if(!R.me)return null;")&&!state.includes("$('#appView')?.classList.contains('hidden')"));
check('authenticated session restores route immediately',state.includes("R.events?.on?.('auth:changed',x=>{if(x?.authenticated){restoreFilters();restoreDraft();R.navigation.restore()}})"));
check('route is re-entered after all modules register',state.includes("R.events?.on?.('bootstrap:ready',()=>{if(R.me){restoreFilters();R.navigation.restore()}})"));
check('slow fallback timer removed',!state.includes('3900')&&!state.includes('setTimeout(()=>{bootGuardUntil'));
check('route fix has a fresh PWA cache identity',/cacheVersion:'v385-core-boundary-route-refresh-[^']+'/.test(config));
check('service worker navigation remains network first',sw.includes("if(req.mode==='navigate')")&&sw.includes("fetch(req,{cache:'no-store'})"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(x=>!x[1]);
console.log(`\n${checks.length-failed.length}/${checks.length} refresh-routing checks passed.`);
if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));
