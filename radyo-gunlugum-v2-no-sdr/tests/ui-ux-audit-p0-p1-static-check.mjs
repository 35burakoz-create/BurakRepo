import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const map=read('app-map-ui.js');
const qsl=read('app-qsl-ui.js');
const ai=read('app-ai-ui.js');
const uiState=read('app-ui-state.js');
const form=read('app-log-form-ui.js');
const integrity=read('app-ui-integrity.css');
const polish=read('app-ui-audit-polish.js');
const modal=read('app-modal-accessibility.js');

assert(bootstrap.includes("'app-ui-audit-polish.js'"),'bootstrap must load the audit polish module');
assert(sw.includes("const UI_UX_AUDIT_P0_P1='20260917-8';"),'service worker must carry the UI/UX audit release marker');
assert(sw.includes("'./app-ui-audit-polish.js'"),'audit polish must be available offline');

for(const [name,source] of [['map',map],['qsl',qsl],['ai',ai]]){
  assert(source.includes('function ownedLogs()'),`${name} UI must expose an active-account log scope`);
  assert(source.includes('x?.user_id==null')&&source.includes('x.user_id===userId'),`${name} UI must preserve ownerless legacy rows while rejecting rows explicitly owned by another account`);
}
assert(qsl.includes('function logById(id){return ownedLogs()'),'QSL actions must resolve records inside the active-account scope');
assert(ai.includes('const root=ensure(),logs=ownedLogs().filter(x=>x.audio_path)'),'AI record picker must use active-account logs only');

assert(uiState.includes('function resetScroll()'),'UI state must expose a fresh-navigation scroll reset');
assert(uiState.includes('if(ctx.restorePosition)restoreScroll(ctx.to);else if(ctx.from&&ctx.from!==ctx.to)resetScroll()'),'fresh route navigation must start at the top while browser restoration keeps prior scroll');

assert(form.includes("const userId=activeUserId();if(!userId||saveFlights.has(userId))return;"),'detailed form must guard concurrent saves per account');
assert(form.includes("if(offline&&id){const text='Mevcut bir kaydı çevrimdışıyken düzenlemek güvenli değil."),'offline editing must fail explicitly instead of silently returning');
assert(form.includes("if(typeof R.queueLog!=='function')throw new Error('Çevrimdışı kayıt kuyruğu henüz hazır değil. Kayıt yapılmadı.');"),'new detailed records must require the offline queue when disconnected');
assert(form.includes('await R.queueLog(data);'),'new detailed records must enter the same offline queue used by quick capture');

assert(integrity.includes('.btn,\n.auth-tab'),'global UI actions must participate in the canonical touch-target floor');
assert(integrity.includes('min-height:var(--app-touch-min,44px)!important'),'interactive controls must respect the 44px touch token');
assert(integrity.includes('font-size:12.5px!important'),'information-bearing microcopy must be lifted out of the old 10px range');
assert(integrity.includes('.app-qsl-progress'),'QSL progression must have a dedicated process surface');

new Function(polish);
assert(polish.includes('Yayını tanı')&&polish.includes('Rehberde ara'),'guide must expose separate identify and browse modes');
assert(polish.includes("includes('hangi bandı denemelisin')"),'propagation recommendation must be moved ahead of technical weather detail');
assert(polish.includes("summary.textContent='Sinyal yolu ve teknik ayrıntılar'"),'station detail must collapse repeated technical signal-path data');
assert(polish.includes("summary.textContent='Diğer işlemler'"),'journal secondary actions must move behind progressive disclosure');
assert(polish.includes('polishHomeScores')&&polish.includes('polishGuideScores'),'numeric recommendation scores must be visually subordinated to qualitative labels');
assert(polish.includes('app-audit-score-secondary'),'remaining technical score values must be styled as secondary information');

assert(modal.includes('.v44-close'),'global modal owner must close search dialogs on Escape');
assert(modal.includes('[data-detail-close]'),'global modal owner must close station detail on Escape');

assert(qsl.includes('app-qsl-backlog'),'QSL records with no process must be separated from active QSL work');
assert(qsl.includes('function progress(id,status)'),'QSL state changes must render as a process rather than five equal actions');
assert(ai.includes('function confidenceLabel(value)'),'AI confidence must use qualitative language as the primary display');
assert(ai.includes('Teknik analiz bilgileri'),'AI model and exact percentage detail must be progressive disclosure');

console.log('ui-ux-audit-p0-p1-static-check: ok');
await import('./map-clustering-static-check.mjs');
