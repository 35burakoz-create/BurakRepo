import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const js=read('app-ui-analytics-drilldown.js');
const css=read('app-ui-analytics-drilldown.css');
const calendar=read('app-calendar-ui.js');
new Function(js);

check('analytics drilldown boots after naming and UX consistency layers',bootstrap.indexOf("'app-ui-feature-names.js'")<bootstrap.indexOf("'app-ui-analytics-drilldown.js'"));
check('analytics drilldown assets are cached by the PWA',sw.includes("const ANALYTICS_DRILLDOWN='20260917-17'")&&sw.includes("'./app-ui-analytics-drilldown.css'")&&sw.includes("'./app-ui-analytics-drilldown.js'"));
check('journal drilldown persists band search and date filters',js.includes("setFilter('filterBand',band)")&&js.includes("setFilter('search',search)")&&js.includes("setFilter('filterDate',date)"));
check('journal drilldown navigates through the canonical router',js.includes("R.router?.go?.('log',{source:'analytics-drilldown',historyMode:'push'})"));
check('analysis band bars drill down by band',js.includes("decorateAnalysisGroup('#bandBars','band')")&&js.includes("kind==='band'?{band:value}:{search:value}"));
check('analysis language and station bars drill down through Journal search',js.includes("decorateAnalysisGroup('#langBars','search')")&&js.includes("decorateAnalysisGroup('#stationBars','search')"));
check('analysis drilldowns are keyboard accessible',js.includes("row.tabIndex=0")&&js.includes("row.setAttribute('role','button')")&&js.includes("event.key!=='Enter'&&event.key!==' '"));
check('Atlas country rows get a separate non-nested Journal action',js.includes("country.insertAdjacentElement('afterend',button)")&&js.includes("button.dataset.atlasJournalCountry")&&js.includes("button.textContent='Günlükte aç'"));
check('Atlas country drilldown uses visible country label as Journal search',js.includes("country.dataset.atlasJournalLabel")&&js.includes("openJournal({search:country.dataset.atlasJournalLabel"));
check('decorators survive analysis and Atlas rerenders',js.includes("'render:all'")&&js.includes("'atlas:changed'")&&js.includes("'store:updated'"));
check('calendar day drilldown remains wired to Journal date filter',calendar.includes("setFilter?.('filterDate',date)")&&calendar.includes("R.router?.go?.('log',{source:'calendar-day'"));
check('drilldown focus state and touch size use shared design tokens',css.includes(':focus-visible')&&css.includes('var(--app-focus')&&css.includes('var(--app-touch-min,44px)'));
check('drilldown animation respects reduced motion',css.includes('@media(prefers-reduced-motion:reduce)'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} analytics drilldown checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
