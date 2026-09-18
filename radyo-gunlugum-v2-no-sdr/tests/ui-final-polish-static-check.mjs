import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const js=read('app-ui-final-polish.js');
const css=read('app-ui-final-polish.css');
const tokens=read('app-design-tokens.css');
const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

new Function(js);
check('canonical caption token exists',tokens.includes('--app-font-caption:12.5px'));
check('canonical compact label token exists',tokens.includes('--app-font-compact-label:11.5px'));
check('canonical readable line height exists',tokens.includes('--app-line-readable:1.45'));
check('canonical icon size tokens exist',tokens.includes('--app-icon-sm:18px')&&tokens.includes('--app-icon-md:20px'));
check('canonical focus ring tokens exist',tokens.includes('--app-focus-ring-width:2px')&&tokens.includes('--app-focus-ring-offset:3px')&&tokens.includes('--app-radio-focus-ring-width:3px')&&tokens.includes('--app-radio-focus-ring-offset:2px'));
check('final polish module is bootstrapped',bootstrap.includes("'app-ui-final-polish.js'"));
check('final polish JS is cached for PWA',sw.includes("'./app-ui-final-polish.js'"));
check('final polish CSS is cached for PWA',sw.includes("'./app-ui-final-polish.css'"));
check('final polish release marker exists',sw.includes("UI_FINAL_POLISH='20260917-18'"));
check('accessibility token consolidation marker exists',sw.includes("ACCESSIBILITY_TOKEN_CONSOLIDATION='20260918-1'"));
check('icon system covers all primary navigation icons',['home','now','log','propagation','memory','plus','menu','search'].every(k=>js.includes(`${k}:`)));
check('icons use inline SVG and currentColor',js.includes('<svg class="app-nav-svg"')&&js.includes('stroke="currentColor"'));
check('icon system has no network or external image dependency',!js.includes('fetch(')&&!js.includes('http://')&&!js.includes('https://')&&!js.includes('<img'));
check('icon sync reacts to navigation and UI mode changes',js.includes("'route:changed'")&&js.includes("'auth:changed'")&&js.includes("'app:uimode'"));
check('compact information text consumes canonical caption token',css.includes('var(--app-font-caption,12.5px)'));
check('navigation icons consume canonical icon tokens',css.includes('var(--app-icon-md,20px)')&&css.includes('var(--app-icon-sm,18px)'));
check('keyboard focus remains visible',css.includes(':focus-visible')&&css.includes('var(--app-focus-ring-width,2px)')&&css.includes('var(--app-focus-ring-offset,3px)')&&css.includes('var(--app-focus'));
check('reduced motion is honored',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('animation:none!important'));

for(const[name,ok]of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} final-polish checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
