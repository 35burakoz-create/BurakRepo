import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const js=read('app-ui-audit-p2.js');
const css=read('app-ui-audit-p2.css');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');

new Function(js);
assert(boot.includes("'app-ui-audit-p2.js'"),'P2 audit module must be booted');
assert(boot.indexOf("'app-atlas-ui.js'")<boot.indexOf("'app-ui-audit-p2.js'"),'P2 audit module must load after Atlas UI');
assert(sw.includes("const UI_UX_AUDIT_P2='20260917-10';"),'service worker must carry the P2 audit release marker');
for(const asset of ['./app-ui-audit-p2.js','./app-ui-audit-p2.css'])assert(sw.includes(`'${asset}'`),`service worker must cache ${asset}`);

assert(js.includes("ATLAS_KEY='radio.atlas.view'")&&js.includes("['map','Harita']")&&js.includes("['countries','Ülkeler']")&&js.includes("['patterns','Desenler']"),'Atlas must expose Harita / Ülkeler / Desenler subviews');
assert(js.includes("card.dataset.p2AtlasSection=view")&&js.includes("card.hidden=view!==atlasView"),'Atlas cards must be progressively disclosed by selected subview');
assert(js.includes("R.atlasUI?.renderMap?.()"),'returning to Atlas map must refresh Leaflet geometry');

assert(js.includes("ANALYSIS_KEY='radio.analysis.period'")&&js.includes('Son 7 gün')&&js.includes('Son 30 gün')&&js.includes('Tümü'),'analysis must expose 7-day, 30-day and all-time periods');
assert(js.includes("const all=R.analysisUI?.ownedLogs?.()||[]"),'analysis periods must reuse active-account ownership filtering');
assert(js.includes('comparisonText(logs.length,previous.length,analysisPeriod)'),'bounded analysis periods must compare against the previous equal period');
assert(js.includes("R.clock?.today?.()"),'period boundaries must use the app clock instead of the browser timezone');

assert(js.includes("data.p2CalendarShift")||js.includes("dataset.p2CalendarShift")||js.includes("data-p2-calendar-shift"),'calendar must expose previous/next month controls');
assert(js.includes("data-p2-calendar-today")&&js.includes("setCalendarMonth(R.calendarUI?.defaultMonth?.()"),'calendar must expose a Today shortcut');
assert(js.includes("input.dispatchEvent(new Event('change',{bubbles:true}))"),'calendar shortcuts must reuse the canonical calendar change path');

assert(js.includes("data-p2-password-toggle")&&js.includes("input.type=reveal?'text':'password'"),'auth must provide a password visibility toggle');
assert(js.includes("toggle.setAttribute('aria-pressed'"),'password visibility state must be announced accessibly');
assert(js.includes('resetPasswordVisibility()'),'password visibility must reset on auth/mode changes');

for(const label of ['Ses hazırla','Yükle','Günlükte kaydet'])assert(js.includes(label),`audio flow missing step: ${label}`);
assert(js.includes("audio:selected")&&js.includes("audio:captured")&&js.includes("audio:uploaded")&&js.includes("form:reset"),'audio flow must react to all canonical audio/form state changes');
assert(js.includes("Günlük formuna dön")&&js.includes("R.router?.go?.('log'"),'uploaded audio must provide a clear path back to the journal form');
assert(js.includes('İşlem, Günlük formundaki kaydı kaydettiğinde tamamlanır.'),'audio upload must explain that upload alone does not save the listening record');

assert(!/\bfetch\s*\(/.test(js),'P2 UX layer must not add network requests');
assert(!/supabase/i.test(js)&&!js.includes('R.S.'),'P2 UX layer must not read or write Supabase directly');
assert(css.includes('.app-p2-segmented')&&css.includes('min-height:44px'),'new segmented controls must preserve touch targets');
assert(css.includes('.app-p2-audio-steps')&&css.includes('@media(max-width:720px)'),'audio steps must adapt to mobile widths');
assert(css.includes(':focus-visible'),'new controls must preserve visible keyboard focus');

console.log('ui-ux-audit-p2-static-check: ok');
