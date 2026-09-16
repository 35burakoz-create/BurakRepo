import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const index=read('index.html');
const styles=read('styles.css');
const base=read('app-base.css');
const ux=read('v38-ux-cleanup.css');
const ds=read('v42-design-system.css');
const shell=read('app-shell-core.js');
const modal=read('app-modal-accessibility.js');
const css=read('app-ui-integrity.css');
const tokens=read('app-design-tokens.css');
const memory=read('app-memory.js');
const sw=read('sw.js');

assert(shell.includes("css('app-ui-integrity.css','appUiIntegrityCss')"),'shell must load the UI integrity layer');
assert(shell.indexOf("css('app-ui-integrity.css','appUiIntegrityCss')")>shell.indexOf("css('app-desktop.css','appDesktopCss')"),'integrity CSS must load after desktop CSS');
assert(!shell.includes("css('app-design-tokens.css','appDesignTokensCss')"),'shell must not reload canonical design tokens after phase 2B');
assert(!shell.includes("document.addEventListener('keydown',trapModalFocus,true)"),'shell must not own a second global modal focus trap');
assert(modal.includes("document.addEventListener('keydown',trap,true)"),'dedicated modal accessibility module must remain the global focus owner');

const stylesLink=index.indexOf('href="styles.css"');
const baseLink=index.indexOf('href="app-base.css"');
const earlyTokens=index.indexOf('href="app-design-tokens.css" data-app-design-tokens-early="1"');
assert(stylesLink>=0&&baseLink>stylesLink&&earlyTokens>baseLink,'canonical tokens must participate in the render-blocking initial paint after legacy/base rules');
assert(!/^\s*:root\s*\{/m.test(styles),'styles.css must not own a root token namespace after phase 2A');
assert(!/^\s*:root\s*\{/m.test(base),'app-base.css must not own a root token namespace after phase 2A');
assert(!/html\.night\{[^}]*--ds-/s.test(base),'app-base dark mode must not redefine DS theme tokens');
assert(/theme variables are owned by app-design-tokens\.css/i.test(styles),'legacy stylesheet must document canonical token ownership');
assert(/theme variables are owned by app-design-tokens\.css/i.test(base),'base stylesheet must document canonical token ownership');
assert(!/:root\s*\{[^}]*--ux-/s.test(ux),'v38 must not own UX root tokens after phase 2B');
assert(!/\.night-mode\s*\{[^}]*--ux-/s.test(ux),'v38 dark mode must not redefine UX tokens after phase 2B');
assert(/theme variables are owned by app-design-tokens\.css/i.test(ux),'v38 must document canonical token ownership');
assert(!/:root\s*\{[^}]*--ds-/s.test(ds),'v42 must not own DS root tokens after phase 2B');
assert(!/\.night-mode\s*\{[^}]*--ds-/s.test(ds),'v42 dark mode must not redefine DS tokens after phase 2B');
assert(/theme variables are owned by app-design-tokens\.css/i.test(ds),'v42 must document canonical token ownership');
assert(ux.includes('var(--ux-accent)')&&ux.includes('var(--ux-muted)'),'v38 must keep consuming compatibility aliases rather than hard-forking theme values');
assert(ds.includes('var(--ds-bg)')&&ds.includes('var(--ds-primary)'),'v42 must keep consuming compatibility aliases rather than hard-forking theme values');

assert(css.includes('@media (min-width:1280px) and (max-width:1399px)'),'desktop rail overlap band must have an explicit safe override');
assert(/#appDesktopNav\{[\s\S]*position:sticky!important/.test(css),'desktop rail must fall back to sticky navigation in the overlap band');
assert(css.includes('.radio-station-detail{z-index:var(--app-layer-modal,20000)!important}'),'station detail must use the central modal layer');
assert(/\.mw-guide-side>button[\s\S]*min-width:var\(--app-touch-min,44px\)!important[\s\S]*min-height:var\(--app-touch-min,44px\)!important/.test(css),'MW guide side actions must use the canonical 44px touch token');
assert(/\.radio-detail-back,[\s\S]*\.radio-detail-fav[\s\S]*min-width:var\(--app-touch-min,44px\)!important/.test(css),'station detail icon actions must use the canonical touch token');
assert(css.includes('font-size:11.5px!important'),'information-bearing microcopy must be raised above the old 9–10px range');
assert(css.includes('.am-browse-status'),'memory pagination status must have a dedicated responsive surface');
assert(css.includes('border:1px solid var(--app-line,#e5e7eb)'),'integrity surfaces must consume canonical line tokens');
assert(css.includes('background:var(--app-surface,#fff)'),'integrity surfaces must consume canonical surface tokens');

for(const token of [
  '--app-bg:#f7f8fc',
  '--app-surface:#fff',
  '--app-text:#111827',
  '--app-primary:#4f46e5',
  '--app-success:#059669',
  '--app-warning:#d97706',
  '--app-danger:#dc2626',
  '--app-radius-lg:24px',
  '--app-space-4:16px',
  '--app-touch-min:44px',
  '--app-layer-modal:20000',
  '--app-layer-toast:30000',
  '--app-radio-amber:#f4b94f'
])assert(tokens.includes(token),`canonical token missing: ${token}`);
assert(tokens.includes('--app-font-sans:system-ui'),'font stack must explicitly use an offline-safe system family');
assert(tokens.includes('body{font-family:var(--app-font-sans)!important}'),'runtime typography must consume the canonical system font token');
for(const alias of [
  '--ds-bg:var(--app-bg)',
  '--ds-primary:var(--app-primary)',
  '--ux-bg:var(--app-bg)',
  '--ux-accent:var(--app-accent)',
  '--radio-bg:var(--app-radio-bg)',
  '--radio-amber:var(--app-radio-amber)',
  '--bg:var(--app-legacy-bg)',
  '--accent:var(--app-legacy-accent)'
])assert(tokens.includes(alias),`compatibility alias missing: ${alias}`);
assert(tokens.includes('html.night,.night-mode{'),'canonical token layer must define one shared dark-mode source');
assert(tokens.includes('--app-bg:#0b1120'),'dark mode must define the canonical background');
assert(tokens.includes('--ds-bg:var(--app-bg)')&&tokens.includes('--ux-bg:var(--app-bg)'),'dark-mode compatibility families must resolve through canonical variables');

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
assert(sw.includes("const DESIGN_TOKEN_FOUNDATION='20260916-20';"),'service worker must carry the design-token foundation marker');
assert(sw.includes("const DESIGN_TOKEN_PHASE2A='20260916-21';"),'service worker must carry the phase 2A marker');
assert(sw.includes("const DESIGN_TOKEN_PHASE2B='20260916-22';"),'service worker must carry the phase 2B marker');
assert(sw.includes("'./app-ui-integrity.css'"),'UI integrity CSS must be available to the offline cache');
assert(sw.includes("'./app-design-tokens.css'"),'canonical design tokens must be available to the offline cache');

console.log('ui-integrity-audit-static-check: ok');
