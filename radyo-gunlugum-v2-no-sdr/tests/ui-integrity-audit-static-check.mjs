import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const shell=read('app-shell-core.js');
const modal=read('app-modal-accessibility.js');
const css=read('app-ui-integrity.css');
const memory=read('app-memory.js');
const sw=read('sw.js');

assert(shell.includes("css('app-ui-integrity.css','appUiIntegrityCss')"),'shell must load the UI integrity layer');
assert(shell.indexOf("css('app-ui-integrity.css','appUiIntegrityCss')")>shell.indexOf("css('app-desktop.css','appDesktopCss')"),'integrity CSS must load after desktop CSS');
assert(!shell.includes("document.addEventListener('keydown',trapModalFocus,true)"),'shell must not own a second global modal focus trap');
assert(modal.includes("document.addEventListener('keydown',trap,true)"),'dedicated modal accessibility module must remain the global focus owner');

assert(css.includes('@media (min-width:1280px) and (max-width:1399px)'),'desktop rail overlap band must have an explicit safe override');
assert(/#appDesktopNav\{[\s\S]*position:sticky!important/.test(css),'desktop rail must fall back to sticky navigation in the overlap band');
assert(css.includes('.radio-station-detail{z-index:var(--app-layer-modal,20000)!important}'),'station detail must use the central modal layer');
assert(/\.mw-guide-side>button[\s\S]*min-width:44px!important[\s\S]*min-height:44px!important/.test(css),'MW guide side actions must keep 44px touch targets');
assert(/\.radio-detail-back,[\s\S]*\.radio-detail-fav[\s\S]*min-width:44px!important/.test(css),'station detail icon actions must keep 44px touch targets');
assert(css.includes('font-size:11.5px!important'),'information-bearing microcopy must be raised above the old 9–10px range');
assert(css.includes('.am-browse-status'),'memory pagination status must have a dedicated responsive surface');

assert(memory.includes('BROWSE_PAGE_SIZE=60'),'memory browsing must use bounded progressive pages');
assert(memory.includes('function resetBrowseVisible()'),'memory pagination must expose an explicit reset path');
assert(memory.includes('function browseStatus(total,shown)'),'memory must disclose how many profiles are visible');
assert(memory.includes('groups.slice(0,shown)'),'memory must render the current progressive window');
assert(memory.includes('data-am-more'),'memory must expose a more-results action when profiles remain');
assert(memory.includes('browseVisible+=BROWSE_PAGE_SIZE'),'more-results action must advance by one page');
assert(!memory.includes('groups.slice(0,120)'),'memory must not silently hard-cut the first 120 profiles');
for(const contract of [
  "state.query=search.value;resetBrowseVisible()",
  "state.mode=b.dataset.amMode;state.profile=null;resetBrowseVisible()",
  "state.filters[k]=e.target.value;resetBrowseVisible()",
  "state.filters.audio=e.target.checked;resetBrowseVisible()"
])assert(memory.includes(contract),`memory filter transition must reset pagination: ${contract}`);

assert(sw.includes("const UI_INTEGRITY_PASS='20260916-19';"),'service worker must carry the UI integrity release marker');
assert(sw.includes("'./app-ui-integrity.css'"),'UI integrity CSS must be available to the offline cache');

console.log('ui-integrity-audit-static-check: ok');
