import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const css=read('app-page-density.css');
const config=read('app-config.js');
const sw=read('sw.js');
assert(css.includes('.app-density-ident span{display:block;margin-top:4px;color:#cbd5e1;font-size:var(--app-font-caption,12.5px);line-height:var(--app-line-readable,1.45)}'),'density identity explanation must use readable caption typography');
assert(css.includes('.app-density-metric span{margin-top:4px;font-size:var(--app-font-caption,12.5px);line-height:var(--app-line-readable,1.45)'),'metric explanatory text must use readable caption typography');
assert(css.includes('.app-density-mix em{font-style:normal;font-size:var(--app-font-compact-label,11.5px)'),'dense mix labels must use the canonical compact-label floor');
assert(css.includes('#tab-calendar .cal-head{font-size:var(--app-font-compact-label,11.5px)'),'calendar headings must use the canonical compact-label floor');
assert(css.includes('.app-density-ident small{font-size:9.5px')&&css.includes('.app-density-mix>span{font-size:9px'),'pure decorative kickers may remain intentionally compact');
assert(config.includes("buildId:'20260921-6'"),'cached typography change must advance buildId');
assert(sw.includes("PWA_CACHE_GENERATION='20260921-6'")&&sw.includes("MICRO_TYPOGRAPHY_READABILITY='20260921-6'"),'service worker generation and typography marker must match');
console.log('micro-typography-static-check: ok');
