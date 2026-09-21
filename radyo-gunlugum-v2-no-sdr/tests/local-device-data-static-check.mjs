import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ui=read('app-ui-state.js');
const offline=read('app-offline-service.js');
const menu=read('app-menu-ui.js');
const css=read('app-menu.css');
const config=read('app-config.js');
const sw=read('sw.js');

new Function(ui);new Function(offline);new Function(menu);

assert(ui.includes('function hasDraft(userId=R.me?.id)'), 'UI state must expose an account-scoped draft presence check');
assert(ui.includes('function clearDraftFor(userId=R.me?.id,{resetVisible=true}={})'), 'UI state must expose targeted draft cleanup');
assert(ui.includes('localStorage.removeItem(key)')&&ui.includes('if(userId===R.me?.id)'), 'targeted draft cleanup must remove only the selected key and gate visible-form reset to the active account');
assert(ui.includes('clearDraftFor,hasDraft,draftStorageKey'), 'targeted draft helpers must be exported');

assert(offline.includes('async function clearUser(userId=R.me?.id||null)'), 'offline service must expose account-scoped queue cleanup');
assert(offline.includes("if(syncFlights.has(userId)||formQueueFlights.has(userId))throw new Error"), 'offline cleanup must refuse to run during active queue/sync writes');
assert(offline.includes('rows.filter(x=>ownerOf(x)===userId)'), 'offline cleanup must select only rows owned by the requested account');
assert(offline.includes('for(const row of owned)await del(row.id)'), 'offline cleanup must delete only selected account rows');
assert(offline.includes("R.events?.emit?.('offline:cleared'"), 'offline cleanup must publish its resulting queue state');
assert(offline.includes('clearUser,isSyncing'), 'offline cleanup must be exported');
assert(!offline.includes(".from('radio_logs').delete("), 'local cleanup must not delete cloud journal rows');

assert(menu.includes("row('Bu cihazdaki yerel veriler','Taslak ve çevrimdışı bekleyen kayıtlar','local-data')"), 'Settings menu must expose local-device cleanup');
assert(menu.includes("sheet('Yerel veriler'"), 'local cleanup must use an explicit review surface before deletion');
assert(menu.includes('Buluttaki Günlük, Favoriler, Ayarlar ve Hatırlatıcılar silinmez.'), 'local cleanup must clearly state cloud data is preserved');
assert(menu.includes("if(a==='local-data')return localData()")&&menu.includes("if(a==='local-data-clear')return clearLocalData(button)"), 'menu must separate review and destructive cleanup actions');
assert(menu.includes('const userId=activeUserId()')&&menu.includes('if(activeUserId()!==userId||token!==lifecycle)'), 'local cleanup result must be pinned to the initiating account and menu lifecycle');
assert(menu.includes('R.offline.clearUser(userId)')&&menu.includes('R.uiStatePersistence.clearDraftFor(userId,{resetVisible:true})'), 'local cleanup must clear only active-account draft and outbox');
assert(!menu.includes(".from('radio_logs').delete(")&&!menu.includes(".from('radio_favorites').delete("), 'menu local cleanup must not issue cloud deletes');
assert(css.includes('.v38-local-data-warning')&&css.includes('.v38-local-data-actions .btn{min-height:var(--app-touch-min,44px)}'), 'local cleanup must have a visible warning and accessible touch target');
assert(css.includes('html.night #v38Sheet .v38-local-data-warning'), 'local cleanup warning must support night mode');

const build=config.match(/buildId:'([^']+)'/)?.[1],generation=sw.match(/PWA_CACHE_GENERATION='([^']+)'/)?.[1];
assert(!!build&&build!=='legacy'&&generation===build, 'local cleanup must ship under the current synchronized PWA generation');
assert(sw.includes("const LOCAL_DEVICE_DATA_CLEANUP='20260921-1';"), 'service worker must carry the local-device cleanup release marker');

console.log('local-device-data-static-check: ok');
