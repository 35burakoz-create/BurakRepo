import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const css=read('app-radio-surface-theme.css');
const extended=read('app-radio-surface-extended.css');
const overlays=read('app-radio-surface-overlays.css');
const density=read('app-page-density.js');
const sw=read('sw.js');
const checks=[];
const check=(name,ok,detail='')=>{checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1};

let syntax=true,syntaxDetail='';
try{new vm.Script(density,{filename:'app-page-density.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('page-density loader syntax remains valid',syntax,syntaxDetail);
check('radio surface layers load after density and night layers in deterministic order',
  density.includes("['app-page-density.css','pageDensityCss'],['app-page-density-night.css','pageDensityNightCss'],['app-radio-surface-theme.css','radioSurfaceThemeCss'],['app-radio-surface-extended.css','radioSurfaceExtendedCss'],['app-radio-surface-overlays.css','radioSurfaceOverlaysCss']"));
check('service worker caches all radio surface layers',sw.includes("'./app-radio-surface-theme.css'")&&sw.includes("'./app-radio-surface-extended.css'")&&sw.includes("'./app-radio-surface-overlays.css'"));
check('service worker carries first-wave harmony marker',sw.includes("RADIO_SURFACE_HARMONY='20260916-14'"));
check('service worker carries second-wave release marker',sw.includes("RADIO_SURFACE_WAVE2='20260916-15'"));
check('service worker carries overlay release marker',sw.includes("RADIO_SURFACE_OVERLAYS='20260916-16'"));

for(const token of ['--app-radio-bg','--app-radio-panel','--app-radio-line','--app-radio-text','--app-radio-muted','--app-radio-amber','--app-radio-green']){
  check(`shared theme defines ${token}`,css.includes(token));
}
check('home receives console surface and amber frequency hierarchy',
  css.includes('#tab-home .v42-home-hero')&&css.includes('#tab-home .v42-frequency')&&css.includes('color:#ffd27f!important'));
check('home keeps live state semantically green',
  css.includes('#tab-home .v42-live-dot')&&css.includes('var(--app-radio-green)'));
check('journal form and record cards receive console surfaces',
  css.includes('#tab-log .form-card,#tab-log .records-card')&&css.includes('#tab-log .record-card')&&css.includes('#tab-log input,#tab-log select,#tab-log textarea'));
check('journal destructive action remains semantically distinct',
  css.includes('#tab-log .record-actions .danger')&&css.includes('var(--app-radio-danger)'));
check('guide receives dark console filters and amber frequency hierarchy',
  css.includes('#tab-guide>.card')&&css.includes('#tab-guide .guide-filters')&&css.includes('#tab-guide [data-guide-frequency]'));
check('guide active score remains semantically green',
  css.includes('#tab-guide .app-guide-score.active')&&css.includes('var(--app-radio-green-soft)'));
check('log and guide density rails use the shared console family',
  css.includes('#tab-log>.app-page-density-rail')&&css.includes('#tab-guide>.app-page-density-rail'));
check('first-wave layer stays scoped away from specialized second-wave tabs',!css.includes('#tab-map')&&!css.includes('#tab-qsl'));
check('first-wave surfaces have keyboard focus visibility',
  css.includes('#tab-home :is(button,a):focus-visible')&&css.includes('#tab-log :is(button,input,select,textarea,summary):focus-visible')&&css.includes('#tab-guide :is(button,input,select,textarea,summary):focus-visible'));
check('first-wave theme keeps primary touch targets at least 44px',css.includes('#tab-home .btn,#tab-log .btn,#tab-guide .btn{min-height:44px}'));
check('first-wave theme has narrow-screen adaptations',css.includes('@media(max-width:760px)')&&css.includes('@media(max-width:480px)'));
check('first-wave theme respects reduced-motion preference',css.includes('@media(prefers-reduced-motion:reduce)'));

check('second wave covers audio, analysis, map, calendar and QSL tabs',
  ['#tab-audio','#tab-analysis','#tab-map','#tab-calendar','#tab-qsl'].every(selector=>extended.includes(selector)));
check('second-wave density rails share the amber console family',
  extended.includes('#tab-audio>.app-page-density-rail')&&extended.includes('#tab-analysis>.app-page-density-rail')&&extended.includes('#tab-map>.app-page-density-rail')&&extended.includes('#tab-calendar>.app-page-density-rail')&&extended.includes('#tab-qsl>.app-page-density-rail'));
check('audio has recorder-console timer, controls and smart-result surfaces',
  extended.includes('#tab-audio .audio-controls')&&extended.includes('#tab-audio .timer')&&extended.includes('#tab-audio .smart-result'));
check('analysis has dark measurement cards and amber data bars',
  extended.includes('#tab-analysis #analysisCards .stat')&&extended.includes('#tab-analysis .bar-track')&&extended.includes('#tab-analysis .bar-fill'));
check('map keeps natural map tiles while framing Leaflet controls as console UI',
  extended.includes('#tab-map #map')&&extended.includes('#tab-map .leaflet-control-zoom a')&&extended.includes('#tab-map .leaflet-popup-content-wrapper')&&!extended.includes('.leaflet-tile{filter:'));
check('calendar uses console day cells and amber count chips',
  extended.includes('#tab-calendar .cal-day')&&extended.includes('#tab-calendar .cal-day .cal-count'));
check('QSL keeps sent and received states semantically distinct',
  extended.includes('#tab-qsl .badge.gold')&&extended.includes('var(--app-radio-amber-soft')&&extended.includes('#tab-qsl .badge.ok')&&extended.includes('var(--app-radio-green-soft'));
check('QSL report/details remain readable dark document surfaces',
  extended.includes('#tab-qsl .qsl-item details')&&extended.includes('#tab-qsl .qsl-report'));
check('second-wave surfaces have keyboard focus visibility',
  extended.includes('#tab-audio :is(button,input,select,textarea,audio):focus-visible')&&extended.includes('#tab-qsl :is(button,input,select,textarea,summary,a):focus-visible'));
check('second-wave theme keeps primary touch targets at least 44px',
  extended.includes('#tab-audio .btn,#tab-analysis .btn,#tab-map .btn,#tab-calendar .btn,#tab-qsl .btn{min-height:44px}'));
check('second-wave theme has mobile adaptations',extended.includes('@media(max-width:760px)')&&extended.includes('@media(max-width:480px)'));
check('second-wave theme respects reduced-motion preference',extended.includes('@media(prefers-reduced-motion:reduce)'));

check('overlay wave themes menu as dark amber console drawer',
  overlays.includes('#v38Sheet.v38-menu-sheet')&&overlays.includes('#v38Sheet .v42-menu-search')&&overlays.includes('#v38Sheet .v38-menu-row.is-current'));
check('overlay wave keeps enabled reminder state semantically green',
  overlays.includes('#v38Sheet .v38-toggle.on')&&overlays.includes('var(--app-radio-green-soft'));
check('overlay wave themes quick log controls and signal selector',
  overlays.includes('#v38Sheet.app-quick-sheet')&&overlays.includes('.app-quick-frequency')&&overlays.includes('.app-quick-signal button.active'));
check('overlay wave themes global search with amber search hierarchy',
  overlays.includes('.v44-sheet')&&overlays.includes('.v44-field:focus-within')&&overlays.includes('.v44-result-type'));
check('overlay wave keeps station detail amber frequency and green live state',
  overlays.includes('.radio-detail-sheet')&&overlays.includes('.radio-detail-hero .radio-frequency')&&overlays.includes('.radio-live.on'));
check('overlay wave themes listening helper modal without rewriting its actions',
  overlays.includes('.app-listen-modal')&&overlays.includes('.app-session-target')&&overlays.includes('.app-listen-form input'));
check('overlay wave applies shared focus visibility',
  overlays.includes('#v38Sheet :is(button,input,select,textarea,summary):focus-visible')&&overlays.includes('.v44-sheet :is(button,input,select,textarea):focus-visible')&&overlays.includes('.radio-detail-sheet :is(button,a,summary):focus-visible'));
check('overlay wave has mobile adaptation and reduced-motion coverage',
  overlays.includes('@media(max-width:760px)')&&overlays.includes('@media(prefers-reduced-motion:reduce)'));

// The CSS injector should append all five layers in deterministic order.
const links=[];
const R={router:{current:()=> 'home'},events:{on(){}},features:{register(){}},me:{id:'u1'},logs:[]};
const document={
  querySelector(){return null},
  createElement(){return{rel:'',href:'',dataset:{}}},
  head:{appendChild(node){links.push(node)}},
  addEventListener(){}
};
const sandbox={window:{R},R,document,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console,setTimeout(){return 1},clearTimeout(){}};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(density,sandbox,{filename:'app-page-density.js'});
check('runtime CSS injection preserves intended layer order',
  links.map(x=>x.href).join('|')==='app-page-density.css|app-page-density-night.css|app-radio-surface-theme.css|app-radio-surface-extended.css|app-radio-surface-overlays.css',links.map(x=>x.href).join('|'));

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} radio-surface harmony checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
