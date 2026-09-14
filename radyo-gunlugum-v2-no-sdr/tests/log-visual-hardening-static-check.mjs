import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const css=read('app-log-form.css');
const density=read('app-page-density.js');
const legacy=read('v38-ux-cleanup.css');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

check('journal page establishes an explicit visual reading order',css.includes('#tab-log:not(.hidden){display:flex!important;flex-direction:column}')&&css.includes('#tab-log .v38-logbar{order:0}')&&css.includes('#tab-log #stats{order:1}')&&css.includes('#tab-log>.two-col{order:2}'));
check('journal hides the redundant density summary panel only on its own route',css.includes('#tab-log>.app-page-density-rail{display:none!important}')&&density.includes("rail('log','Dinleme günlüğü'"));
check('journal record list uses consistent grid rhythm',css.includes('#tab-log #records{display:grid;gap:8px}')&&css.includes('#tab-log .record-card{margin:0!important}'));
check('collapsed cards hide notes that previously leaked outside disclosure',css.includes('#tab-log .record-card:not(.v38-expanded) .app-log-notes'));
check('collapsed cards hide smart confidence that previously leaked outside disclosure',css.includes('.record-card:not(.v38-expanded) .app-log-confidence{display:none!important}'));
check('expanded cards restore notes explicitly',css.includes('#tab-log .record-card.v38-expanded .app-log-notes{display:block!important}'));
check('expanded cards restore confidence as a compact inline pill',css.includes('#tab-log .record-card.v38-expanded .app-log-confidence{display:inline-flex!important;align-items:center}'));
check('journal disclosure chevron has a real control surface',css.includes('width:32px;height:32px')&&css.includes('border-radius:10px')&&css.includes('place-items:center'));
check('expanded disclosure chevron receives accent treatment',css.includes('.record-card.v38-expanded .record-top:after{background:#eef2ff;border-color:#c7d2fe;color:#4f46e5!important}'));
check('program text has an explicit visual heading level inside expanded card',css.includes('#tab-log .record-body>b{display:block;margin-bottom:3px'));
check('notes receive a compact visual label',css.includes("#tab-log .app-log-notes:before{content:'NOT'"));
check('smart confidence is styled as a bounded status pill',css.includes('#tab-log .app-log-confidence{padding:5px 8px;border:1px solid #e2e8f0;border-radius:999px'));
check('expanded action zone is separated from content',css.includes('.record-card.v38-expanded .record-actions{padding-top:2px;border-top:1px solid #eef2f7}'));
check('export actions are visually grouped instead of floating separately',css.includes('.records-card>.section-head .row-actions{display:inline-grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px'));
check('export actions retain compact but usable height',css.includes('.records-card>.section-head .row-actions .btn{min-height:36px!important'));
check('filter surface now has a visible section heading',css.includes(".records-card .filters:before{content:'KAYIT FİLTRELERİ'"));
check('filter controls keep full touch height',css.includes('.records-card .filters input,#tab-log .records-card .filters select{min-height:44px;background:#fff}'));
check('mobile journal statistics become a horizontal summary rail',css.includes('grid-auto-flow:column')&&css.includes('grid-auto-columns:minmax(138px,42vw)')&&css.includes('overflow-x:auto'));
check('mobile statistics use scroll snapping instead of a tall card wall',css.includes('scroll-snap-type:x proximity')&&css.includes('#tab-log .stat{scroll-snap-align:start;min-height:74px}'));
check('mobile summary rail hides decorative scrollbar',css.includes('#tab-log .stats::-webkit-scrollbar{display:none}')&&css.includes('scrollbar-width:none'));
check('very narrow phones widen each summary card for readability',css.includes('grid-auto-columns:minmax(132px,68vw)'));
check('mobile export actions fill the available row cleanly',css.includes('#tab-log .records-card>.section-head .row-actions{width:100%}')&&css.includes('#tab-log .records-card>.section-head .row-actions .btn{width:100%}'));
check('mobile form close action cannot become a tiny corner control',css.includes('#tab-log #cancelEditBtn:not(.hidden){width:100%}'));
check('mobile primary save row stacks message and action without collision',css.includes('#tab-log #logForm>.row-actions{display:grid;grid-template-columns:1fr!important;align-items:stretch;width:100%}')&&css.includes('#tab-log #logForm>.row-actions #formMsg{width:100%;margin-top:0}'));
check('mobile advanced GPS action uses full available width',css.includes('#tab-log .app-log-advanced-grid>.row-actions{align-items:stretch;flex-direction:column}')&&css.includes('#tab-log .app-log-advanced-grid>.row-actions .btn{width:100%}'));
check('night mode covers new export control group',css.includes('html.night #tab-log .records-card>.section-head .row-actions')&&css.includes('background:#0f172a;border-color:#334155'));
check('night mode covers filter input surfaces',css.includes('html.night #tab-log .records-card .filters input')&&css.includes('background:#111827;color:#f8fafc;border-color:#334155'));
check('night mode covers new disclosure control surface',css.includes('html.night #tab-log .record-top:after')&&css.includes('background:#172033;border-color:#334155'));
check('night mode covers expanded disclosure accent',css.includes('html.night #tab-log .record-card.v38-expanded .record-top:after')&&css.includes('background:#252456;border-color:#4f46e5;color:#c7d2fe!important'));
check('night mode covers confidence pill',css.includes('html.night #tab-log .app-log-confidence')&&css.includes('background:#172033;border-color:#334155;color:#cbd5e1'));
check('fine-pointer card hover adds hierarchy without motion translation',css.includes('.record-card:not(.v38-expanded):hover{border-color:#cbd5e1!important;box-shadow:0 7px 20px')&&!css.includes('.record-card:not(.v38-expanded):hover{transform:'));
check('existing reduced-motion protection remains intact',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('#tab-log .record-card')&&css.includes('transition:none!important'));
check('legacy disclosure behavior still hides main body and actions until expansion',legacy.includes('.record-card .record-body,.record-card>details,.record-card .record-actions{display:none!important}')&&legacy.includes('.record-card.v38-expanded .record-body,.record-card.v38-expanded>details,.record-card.v38-expanded .record-actions{display:block!important}'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} journal visual hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
