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
assert(ui.includes('function hasDraft(userId=R.me?.id)'),'UI state must expose per-account draft presence');
assert(ui.includes('function clearDraftFor(userId=R.me?.id)'),'UI state must expose per-account draft deletion');
assert(ui.includes('localStorage.removeItem(key)'),'draft deletion must remove the scoped key');
assert(ui.includes('if(userId===R.me?.id)localStorage.removeItem(DRAFT_KEY)'),'only the active account clear may also discard the legacy unscoped draft');
assert(ui.includes('clearDraftFor,hasDraft,draftStorageKey'),'draft-management APIs must be exported for the settings surface');

assert(offline.includes('async function clearUser(userId=R.me?.id||null)'),'offline queue must expose per-user cleanup');
assert(offline.includes('if(syncFlights.has(userId)||formQueueFlights.has(userId))throw new Error'),'offline cleanup must refuse in-flight sync/form mutations');
assert(offline.includes('const rows=await list(userId)'),'offline cleanup must begin from exact-owner rows');
assert(offline.includes('if(ownerOf(row)!==userId)continue'),'offline cleanup must never delete a foreign account row');
assert(offline.includes("if(R.me?.id!==userId)throw new Error('Oturum değişti; yerel veri temizleme güvenli biçimde durduruldu.')"),'offline cleanup must stop if the active account changes');
assert(offline.includes('R.offline={queueLog,syncOutbox,count,list,clearUser'),'per-user cleanup must be part of the offline service API');

assert(menu.includes("row('Yerel veriler','Taslak ve çevrimdışı kuyruğu yönet','local-data')"),'Settings menu must expose local-device data management');
assert(menu.includes('Buluttaki Günlük kayıtların, favorilerin, ayarların ve hatırlatıcıların değişmez.'),'local data screen must state that cloud data is unaffected');
assert(menu.includes('Bu işlem geri alınamaz.'),'local deletion must require a second confirmation surface');
assert(menu.includes("data-action=\"local-data-clear\""),'confirmation surface must expose an explicit destructive action');
assert(menu.includes('R.offline.clearUser(userId)')&&menu.includes('R.uiStatePersistence.clearDraftFor(userId)'),'local deletion must clear both outbox and draft');
assert(menu.includes('R.uiStatePersistence?.resetVisibleForm?.()'),'successful cleanup must blank the visible form so pagehide cannot recreate the draft');
const clearStart=menu.indexOf('async function clearLocalData'),clearEnd=menu.indexOf('function syncThemeRow',clearStart),clearSection=menu.slice(clearStart,clearEnd);
assert(clearStart>=0&&clearEnd>clearStart&&!clearSection.includes('R.S.'),'local device cleanup must never issue Supabase mutations');

assert(css.includes('.v38-local-data')&&css.includes('.v38-local-data-warning'),'local data screens must have dedicated readable styling');
assert(css.includes('.v38-local-data-clear')&&css.includes('var(--app-touch-min,44px)'),'destructive control must preserve the canonical touch target');
assert(sw.includes("const LOCAL_DEVICE_DATA_CONTROL='20260918-5';"),'service worker must carry the local-device-data release marker');
const build=config.match(/buildId:'([^']+)'/)?.[1],generation=sw.match(/PWA_CACHE_GENERATION='([^']+)'/)?.[1];
assert(build==='20260918-5'&&generation===build,'local-device runtime change must ship with a fresh PWA generation');

console.log('local-device-data-static-check: ok');
