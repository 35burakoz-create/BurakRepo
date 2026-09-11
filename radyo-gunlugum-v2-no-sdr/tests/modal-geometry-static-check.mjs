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
const cache=config.match(/cacheVersion:'v385-core-boundary-[^']*20260910-(\d+)'/);
check('geometry fix has a fresh PWA generation',!!cache&&Number(cache[1])>=17);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} modal-geometry checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
