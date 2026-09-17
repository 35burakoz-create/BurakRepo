import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const boot=read('app-bootstrap.js');
const sw=read('sw.js');
const js=read('app-branding-share-tools.js');
const css=read('app-branding-share-tools.css');
const accessibility=read('app-branding-share-accessibility.js');
const accessibilityCss=read('app-branding-share-accessibility.css');

new Function(js);
new Function(accessibility);
assert(boot.includes("'app-branding-experience.js','app-branding-share-tools.js'"),'share tools must boot immediately after the base branding experience');
assert(boot.includes("'app-branding-share-tools.js','app-branding-share-accessibility.js'"),'share accessibility must boot immediately after share tools');
assert(sw.includes("const SHARE_CARD_LAYOUT_TOOLS='20260917-6';"),'service worker must carry share-layout release marker');
assert(sw.includes("const SHARE_CARD_ACCESSIBILITY='20260917-7';"),'service worker must carry share accessibility release marker');
for(const asset of ['./app-branding-share-tools.js','./app-branding-share-tools.css','./app-branding-share-accessibility.js','./app-branding-share-accessibility.css'])assert(sw.includes(`'${asset}'`),`service worker must cache ${asset}`);
assert(js.includes("new Set(['classic','dial','minimal'])"),'share cards must expose classic, dial and minimal layouts');
assert(js.includes('Klasik')&&js.includes('Kadran')&&js.includes('Sade'),'layout selector must use clear Turkish labels');
assert(js.includes('R.brandingExperience?.shareCardData?.(log)'),'layout renderer must reuse the privacy-filtered base card data');
for(const privateField of ['location','latitude','longitude','notes','signal_strength','signal','transcript','program','qsl']){
  assert(!js.includes(`log?.${privateField}`),`layout tools must not read private field ${privateField}`);
  assert(!accessibility.includes(`log?.${privateField}`),`share accessibility must not read private field ${privateField}`);
}
assert(js.includes("credentials:'omit'"),'layout background fetch must not forward ambient credentials');
assert(js.includes("canvas.toBlob")&&js.includes("'image/png'"),'alternate layouts must render PNG files');
assert(js.includes("save.dataset.shareSave='1'"),'share dialog must receive a save-card action');
assert(js.includes("a.download=file.name")&&js.includes("a.click()"),'base save-card action must retain a browser-download fallback');
assert(js.includes('URL.revokeObjectURL')&&js.includes('revokeActive()'),'temporary preview/download object URLs must be cleaned up');
assert(js.includes("window.addEventListener('click',onClick,true)"),'share tools must intercept native share before the base document handler');
assert(js.includes("navigator.canShare?.({files:[file]})")&&js.includes('navigator.share(payload)'),'selected layout must be shareable as a file when supported');
assert(js.includes("localStorage.setItem(LAYOUT_KEY,value)"),'selected card layout should persist locally');
assert(css.includes('.app-branding-share-tools')&&css.includes('[data-share-save]'),'layout selector and save action must be styled');
assert(css.includes('@media(max-width:620px)')&&css.includes('@media(max-width:420px)'),'share tools must adapt to small screens');

assert(accessibility.includes("badge.setAttribute('role','status')")&&accessibility.includes("badge.setAttribute('aria-live','polite')"),'dynamic preview status must be announced politely to assistive technology');
assert(accessibility.includes("dialog.setAttribute('aria-busy',String(busy))")&&accessibility.includes("cover.setAttribute('aria-busy',String(busy))"),'dialog and preview must expose rendering busy state');
assert(accessibility.includes("select.setAttribute('aria-describedby',desc)")&&accessibility.includes("select.setAttribute('aria-controls',cover.id)"),'layout selector must be associated with its help text and preview');
assert(accessibility.includes("save.setAttribute('aria-label',`${name} kartını PNG olarak kaydet`)")&&accessibility.includes("native.setAttribute('aria-describedby',status?.id||'')"),'save/share actions must expose meaningful assistive descriptions');
assert(accessibility.includes("delete save.dataset.shareSave")&&accessibility.includes("save.dataset.shareSaveEnhanced='1'"),'enhanced save action must bypass the earlier generic save handler without duplicating activation');
assert(accessibility.includes("typeof window.showSaveFilePicker==='function'")&&accessibility.includes('handle.createWritable()'),'desktop save should use the native file picker when supported');
assert(accessibility.includes("if(error?.name==='AbortError')return;"),'canceling the native save picker must exit quietly instead of triggering a fallback download');
assert(accessibility.includes("button.disabled=busyState(dialog)")&&accessibility.includes("button.removeAttribute('aria-busy')"),'save button state must be restored after native save, cancel, or fallback');
assert(accessibility.includes('await anchorSave(file)')&&accessibility.includes('a.download=safeName(file)'),'save flow must fall back to a conventional PNG download');
assert(accessibility.includes("replace(/[\\\\/:*?\"<>|\\u0000-\\u001f]/g,'-')"),'download filename must strip filesystem-invalid characters');
assert(accessibility.includes("URL.revokeObjectURL(url),1800"),'enhanced fallback download URL must be revoked');
assert(!accessibility.includes('fetch(')&&!accessibility.includes('supabase'),'accessibility layer must not add network or storage reads');
assert(accessibilityCss.includes('.app-branding-share-sr')&&accessibilityCss.includes(':focus-visible'),'share accessibility must include a screen-reader-only status and visible keyboard focus');
assert(accessibilityCss.includes('@media(prefers-reduced-motion:reduce)'),'share rendering feedback must respect reduced-motion preferences');
console.log('branding-share-tools-static-check: ok');
