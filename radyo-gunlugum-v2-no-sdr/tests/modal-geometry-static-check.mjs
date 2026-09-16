import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const audit=read('app-audit-polish.css');
const ux=read('v38-ux-cleanup.css');
const foundation=read('app-foundation.css');
const listening=read('app-listening.css');
const glossary=read('app-radio-glossary.css');
const collection=read('app-collection.css');
const search=read('v44-search-rebuild.css');
const user=read('app-user-services.js');
const config=read('app-config.js');
const detail=read('app-station-detail-ui.js');
const modal=read('app-modal-accessibility.js');
const guide=read('app-mw-guide-ui.js');
const polish=read('app-radio-console-polish.css');
const mwCss=read('app-mw-guide.css');
const sw=read('sw.js');

check('bottom dock remains the base fixed navigation layer',/\.v38-dock\{[^}]*z-index:15000/.test(ux));
check('audit defines a modal layer above the dock',audit.includes('--app-layer-dock:15000')&&audit.includes('--app-layer-modal-bg:19990')&&audit.includes('--app-layer-modal:20000'));
check('foundation dialogs are lifted above the dock',audit.includes('.foundation-diag-overlay,.app-listen-modal-bg,.app-radio-glossary-bg,.app-collection-overlay,.v44-overlay')&&audit.includes('.foundation-diag,.app-listen-modal,.app-radio-glossary-modal,.app-collection,.v44-sheet'));
check('global search overlay is above the dock',/\.v44-overlay\{[^}]*z-index:19990/.test(search));
check('global search sheet is above the dock',/\.v44-sheet\{[^}]*z-index:20000/.test(search));
check('global search uses dynamic viewport height',search.includes('max-height:min(92dvh,860px)'));
check('global search results reserve device safe area',search.includes('env(safe-area-inset-bottom)')&&search.includes('.v44-results{overflow:auto'));
check('fullscreen listening sits above ordinary modals',audit.includes('--app-layer-fullscreen:21000')&&audit.includes('.app-listen{z-index:var(--app-layer-fullscreen)!important}'));
check('toast remains above interactive layers',audit.includes('--app-layer-toast:30000')&&audit.includes('.app-toast{z-index:var(--app-layer-toast)!important}'));
check('reminder primary action is sticky',audit.includes('#appReminder #appRemSave')&&audit.includes('position:sticky!important')&&audit.includes('min-height:52px!important'));
check('preferences primary action shares sticky protection',audit.includes('#appPrefs #appPrefsSave'));
check('mobile dialogs use dynamic viewport height',audit.includes('max-height:min(92dvh,820px)!important'));
check('mobile dialogs reserve device safe area',audit.includes('env(safe-area-inset-bottom)'));
check('foundation modal itself scrolls rather than being clipped',foundation.includes('overflow:auto'));
check('listening helper modal is a mobile bottom sheet',listening.includes('.app-listen-modal{top:auto;bottom:0'));
check('radio glossary modal is bounded on mobile',glossary.includes('max-height:88vh'));
check('collection modal is bounded on mobile',collection.includes('max-height:92vh'));
check('reminder action exists in canonical user service',user.includes('id="appRemSave"')&&user.includes('Hatırlatıcıyı kaydet'));
check('settings action exists in canonical user service',user.includes('id="appPrefsSave"')&&user.includes('Ayarları kaydet'));
const cache=config.match(/cacheVersion:'v385-core-boundary-[^']*-(\d{8})-(\d+)'/);
check('geometry fix has a fresh PWA generation',!!cache&&Number(cache[1])>=20260910&&Number(cache[2])>=17);

check('station detail favorite uses guide id instead of passing the guide object',detail.includes('R.userServices.toggleFavorite(state.guideId)')&&!detail.includes('toggleFavorite(guide)'));
check('station detail favorite reflects persisted state accessibly',detail.includes('function favoriteState(row)')&&detail.includes('aria-pressed="${state.active?\'true\':\'false\'}"')&&detail.includes("button.classList.toggle('active',state.active)"));
check('station detail dialog has a descriptive relationship to the station subtitle',detail.includes('aria-describedby="radioDetailSubtitle"')&&detail.includes('id="radioDetailSubtitle"'));
check('station detail closes without stale focus restoration on route or account transitions',detail.includes("R.events?.on?.('route:before',()=>close({restoreFocus:false}))")&&detail.includes("R.events?.on?.('auth:changed',()=>close({restoreFocus:false}))"));
check('shared modal accessibility recognizes station detail close controls',modal.includes('[data-detail-close]'));
check('shared modal route and auth cleanup closes station detail without restoring old-route focus',modal.includes('R.stationDetailUI?.close?.({restoreFocus:false})'));
check('favorite active state is visually distinct and focus visible',polish.includes('.radio-detail-fav.active')&&polish.includes('[aria-pressed="true"]')&&polish.includes('.radio-detail-fav:focus-visible'));

check('MW guide progressively renders long result sets in bounded pages',guide.includes('const PAGE_SIZE=60')&&guide.includes('rows.slice(0,visibleLimit)')&&guide.includes('data-mw-more')&&guide.includes('visibleLimit+=PAGE_SIZE'));
check('MW guide resets pagination when search frequency or class filters change',guide.includes('visibleLimit=PAGE_SIZE')&&guide.includes('{resetLimit:true}'));
check('MW guide exposes list progress and a return-to-filters action',guide.includes('role="status" aria-live="polite"')&&guide.includes('data-mw-top')&&guide.includes('Filtrelere dön ↑'));
check('MW class filters support arrow Home and End keyboard navigation',guide.includes("key==='ArrowRight'")&&guide.includes("key==='ArrowLeft'")&&guide.includes("key==='Home'")&&guide.includes("key==='End'"));
check('MW guide filter group is labeled for assistive technology',guide.includes("bar.setAttribute('role','group')")&&guide.includes("bar.setAttribute('aria-label','MW alım sınıfı filtresi')"));
check('MW guide pagination controls remain touch-friendly on small screens',mwCss.includes('.mw-guide-pagination')&&mwCss.includes('min-height:40px')&&mwCss.includes('data-mw-more'));
check('service worker carries station-detail accessibility release marker',sw.includes("STATION_DETAIL_ACCESSIBILITY='20260916-6'"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} modal-geometry checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
