import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const bootstrap=read('app-bootstrap.js');
const config=read('app-config.js');
const sw=read('sw.js');
const service=read('app-radio-console-service.js');
const now=read('app-now-ui.js');
const guide=read('app-mw-guide-ui.js');
const detail=read('app-station-detail-ui.js');
const favoriteUi=read('app-favorites-ui.js');
const favoriteCss=read('app-favorites-ui.css');
const css=read('app-radio-console.css');
const polishCss=read('app-radio-console-polish.css');
const mwCss=read('app-mw-guide.css');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}
for(const [name,src] of [['service',service],['now',now],['mw-guide',guide],['detail',detail],['favorites-ui',favoriteUi]]){let ok=true,detailText='';try{new vm.Script(src,{filename:`${name}.js`})}catch(error){ok=false;detailText=error.message}check(`${name} module syntax`,ok,detailText)}
check('bootstrap loads radio console service before current screen',bootstrap.indexOf("'app-radio-console-service.js'")>0&&bootstrap.indexOf("'app-radio-console-service.js'")<bootstrap.indexOf("'app-now-ui.js'"));
check('bootstrap loads station detail and dedicated MW guide',bootstrap.includes("'app-station-detail-ui.js'")&&bootstrap.includes("'app-mw-guide-ui.js'"));
check('PWA cache version remains on current stable radio console generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-52'"));
check('service worker carries radio-polish signature',sw.includes("RADIO_INTELLIGENCE_POLISH='20260916-5'"));
check('service worker carries station-detail accessibility signature',sw.includes("STATION_DETAIL_ACCESSIBILITY='20260916-6'"));
check('service worker carries favorites discovery signature',sw.includes("FAVORITES_DISCOVERY='20260916-7'"));
for(const asset of ['app-radio-console-service.js','app-radio-console.css','app-radio-console-polish.css','app-favorites-ui.js','app-favorites-ui.css','app-station-detail-ui.js','app-mw-guide-ui.js','app-mw-guide.css'])check(`service worker caches ${asset}`,sw.includes(`'./${asset}'`));
check('radio console service loads additive polish and favorites styles',service.includes("loadConsoleCss('app-radio-console.css','radio-console-css')")&&service.includes("loadConsoleCss('app-radio-console-polish.css','radio-console-polish-css')")&&service.includes("loadConsoleCss('app-favorites-ui.css','favorites-ui-css')"));
check('radio console service loads shared favorites behavior module',service.includes("loadConsoleScript('app-favorites-ui.js','favorites-ui-script')"));
check('MW service uses authenticated ranking RPC and bounded p_limit',service.includes("R.S.rpc('radio_mw_now_candidates',{p_limit:n})")&&service.includes('Math.min(500'));
check('MW service scopes cache to active authenticated user',service.includes('cacheUser!==uid')&&service.includes('if(userId()!==uid)return[]'));
check('MW service preserves nullable score and geometry instead of Number(null) zero coercion',service.includes('const finiteOrNull=value=>')&&service.includes('score=finiteOrNull(row.score)')&&service.includes('distance=finiteOrNull(row.distance_km)')&&service.includes('bearing=finiteOrNull(row.bearing_deg)'));
check('MW service exposes structured astronomical and target intelligence from RPC explanation',service.includes("period==='night'?'Gece yayılımı'")&&service.includes("lower(x).startsWith('hedef ')")&&service.includes('solar_elevation'));
check('MW service exposes active listening origin instead of forcing Bozköy in detail consumers',service.includes('R.listeningOrigin?.()?.name')&&service.includes('function originName()'));
check('current screen uses real radio console rows and 0–100 RPC scores',now.includes('R.radioConsole?.rows?.()')&&now.includes("e?._radioConsole?'100':'99'"));
check('current screen exposes transmitter detail affordances',now.includes('data-station-detail')&&now.includes('Neden bu aday?')&&now.includes('MW bandı'));
check('current screen explicitly labels ungeocoded known sites',now.includes('Saha biliniyor · koordinat doğrulanmadı'));
check('current MW hero derives four chips from structured intelligence instead of positional reason indexes',now.includes('function mwReasonChips(e)')&&now.includes('R.radioConsole?.intelligence?.(e)')&&!now.includes("compactReason(e,'Gece',0)"));
check('current MW hero shows real solar elevation, distance, target bonus and personal adjustment',now.includes("solar_elevation")&&now.includes("label:'Mesafe'")&&now.includes("label:'Hedef'")&&now.includes("label:'Geçmişim'"));
check('current MW hero signs solar elevation and color-codes contribution direction semantically',now.includes('function signedLocale(n)')&&now.includes('function contributionTone(n)')&&now.includes("tone:targetKnown?contributionTone(tb):'muted'")&&now.includes('tone:contributionTone(pa)')&&now.includes('chipColor(x.tone)'));
check('current MW candidate cards keep site, activity and geometry visible together',now.includes('radio-candidate-site')&&now.includes('radio-candidate-meta')&&now.includes("e.active_now?'● yayında':'○ aktif değil'")&&now.includes('geoText(e)'));
check('current MW candidate cards expose score and reception class as separate scan anchors',now.includes('radio-candidate-score')&&now.includes('radio-candidate-footer')&&now.includes('radio-candidate-quality'));
check('current MW why list uses semantic activity target personal and propagation reasons',now.includes('function whyParts(e)')&&now.includes('intel.activity?.text')&&now.includes('intel.target?.text')&&now.includes('intel.personal?.text')&&now.includes('intel.propagation?.text'));
check('shared favorites UI decorates current hero and candidate cards without nesting action buttons inside cards',favoriteUi.includes("$('#v38Now .radio-hero')")&&favoriteUi.includes("$$('#v38Now .radio-candidate-card')")&&favoriteUi.includes('radio-favorite-badge')&&favoriteUi.includes('radio-candidate-favorite'));
check('shared favorites UI provides direct hero favorite action with accessible pressed state',favoriteUi.includes('data.radioFavorite')||favoriteUi.includes('dataset.radioFavorite'));
check('shared favorites UI exposes semantic favorite-change event when collection signature changes',favoriteUi.includes("R.events?.emit?.('favorites:changed'")&&favoriteUi.includes('function favoriteSignature()'));
check('favorite styles distinguish active hero and candidate states',favoriteCss.includes('.radio-favorite-action.active')&&favoriteCss.includes('.radio-candidate-card.favorite'));
check('dedicated MW guide renders one card per schedule/transmitter candidate',guide.includes('data-station-detail="${esc(row.schedule_id)}"')&&guide.includes('yayın/verici adayı'));
check('MW guide exposes requested reception filters',guide.includes("['local','Yerel']")&&guide.includes("['regional','Bölgesel']")&&guide.includes("['dx','Gece DX']")&&guide.includes("['far','Çok uzak']"));
check('MW guide exposes live counts beside reception filters',guide.includes('function filterCounts()')&&guide.includes('(counts[value]||0).toLocaleString')&&mwCss.includes('.mw-guide-class-filters button b'));
check('MW guide preserves nullable score and distance instead of coercing them to zero',guide.includes('function finiteNumber(value)')&&guide.includes('distance=finiteNumber(row.distance_km)')&&guide.includes('score=finiteNumber(row.score)')&&guide.includes("n===null?'unknown'"));
check('MW guide avoids fake direction or distance when coordinates are missing',guide.includes("row.transmitter_site_name?'Saha biliniyor · koordinat doğrulanmadı':'Verici konumu belirsiz'"));
check('MW guide distinguishes unknown score from a weak score',guide.includes("return n===null?'Puan yok'")&&guide.includes('data-score-unknown')&&mwCss.includes('.mw-guide-score.unknown'));
check('MW guide target and personal chips use signed semantic contribution states',guide.includes('function contributionClass(n)')&&guide.includes("klass:targetKnown?contributionClass(targetBonus):'neutral'")&&guide.includes('klass:contributionClass(personal)')&&mwCss.includes('.mw-guide-tags span.negative'));
check('MW guide uses astronomical propagation status rather than equating Gece DX with current night',guide.includes("period==='night'")&&guide.includes("period==='day'")&&!guide.includes("klass==='dx'?'☾ gece'"));
check('MW guide visually distinguishes day and night intelligence chips',mwCss.includes('.mw-guide-tags span.night')&&mwCss.includes('.mw-guide-tags span.day'));
check('MW guide gives very narrow screens a full-width identity column and horizontal score footer',mwCss.includes('@media(max-width:420px)')&&mwCss.includes('.mw-guide-card{grid-template-columns:1fr')&&mwCss.includes('.mw-guide-side{display:flex'));
check('MW guide favorite filter is orthogonal to reception class filtering',guide.includes('let classFilter=')&&guide.includes('favoriteOnly=false')&&guide.includes('function classFiltered()')&&guide.includes("!favoriteOnly||favoriteState(x).active"));
check('MW guide favorite filter shows live favorite count and accessible pressed state',guide.includes('function favoriteCount()')&&guide.includes('data-mw-favorites')&&guide.includes("aria-pressed=\"${favoriteOnly?'true':'false'}\""));
check('MW guide cards expose favorite marker and direct favorite toggle',guide.includes('mw-guide-favorite-mark')&&guide.includes('data-mw-favorite')&&favoriteCss.includes('.mw-guide-favorite-toggle.active'));
check('MW guide keyboard filter navigation includes favorite toggle',guide.includes("querySelectorAll('#mwGuideClassFilters [data-mw-filter-control]')")&&guide.includes('data-mw-filter-control'));
check('MW guide refreshes when favorites change',guide.includes("R.events?.on?.('favorites:changed'"));
check('station detail is a modal dialog with escape/close support',detail.includes('role="dialog" aria-modal="true"')&&detail.includes("e.key==='Escape'")&&detail.includes('data-detail-close'));
check('station detail leaves missing geometry explicit',detail.includes('Koordinat doğrulanmadı')&&detail.includes('mesafe ve yön hesaplanmıyor'));
check('station detail derives personal summary from owned runtime logs, not hardcoded examples',detail.includes('const logs=(R.logs||[]).filter')&&!detail.includes('8 deneme · 6 başarılı'));
check('station detail path uses active listening location rather than a hardcoded origin label',detail.includes('function originName()')&&detail.includes('${esc(origin)}')&&!detail.includes('<small class="origin-label">Bozköy</small>'));
check('station detail surfaces propagation and geometry confidence',detail.includes('<dt>Yayılım</dt>')&&detail.includes('<dt>Konum güveni</dt>')&&detail.includes('solar_elevation'));
check('station detail leads with four quick radio metrics before deep sections',detail.includes('function quickSummary(row,intel)')&&detail.includes('radio-detail-summary')&&detail.indexOf('signal-path')<detail.indexOf('<h3>Yayın</h3>'));
check('station detail guards nullable distance score bearing and power before display',detail.includes('function finiteNumber(value)')&&detail.includes('score=finiteNumber(row.score)')&&detail.includes('distance=finiteNumber(row.distance_km)')&&detail.includes('power=finiteNumber(row.power_kw)'));
check('mobile detail score stays in document flow instead of overlapping long station names',polishCss.includes('.radio-detail-score{position:static!important')&&polishCss.includes('.radio-detail-hero-main{padding-right:0!important}'));
check('candidate polish uses compact flex cards and readable status metadata on mobile',polishCss.includes('.radio-candidate-card{position:relative;display:flex')&&polishCss.includes('.radio-candidate-status.on')&&polishCss.includes('@media(max-width:480px)'));
check('visual system contains amber radio frequency hierarchy and dark console surface',css.includes('--radio-amber:#f4b94f')&&css.includes('.radio-frequency')&&css.includes('.radio-console-screen'));
check('MW guide styles preserve compact mobile cards',mwCss.includes('.mw-guide-card')&&mwCss.includes('@media(max-width:540px)'));

const serviceAssets=[];
const serviceR={events:{on(){},emit(){}},features:{register(){}}};
const serviceDocument={querySelector(){return null},createElement(tag){return{tagName:String(tag).toUpperCase(),dataset:{}}},head:{appendChild(node){serviceAssets.push(node)}}};
const serviceSandbox={window:{R:serviceR},R:serviceR,document:serviceDocument,globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console};
serviceSandbox.globalThis=serviceSandbox;
vm.createContext(serviceSandbox);
vm.runInContext(service,serviceSandbox,{filename:'app-radio-console-service.js'});
const nullableRow=serviceR.radioConsole.normalizeRow({frequency:600,score:null,distance_km:null,bearing_deg:null,personal_adjustment:null,station:'Test MW',country:'TUR',transmitter_site_name:'Test Saha'});
check('runtime MW normalization keeps null score distance and bearing nullable',nullableRow.score===null&&nullableRow.distance_km===null&&nullableRow.bearing_deg===null&&nullableRow.personal_adjustment===0);
check('runtime MW geometry confidence does not upgrade named null-coordinate site to verified',serviceR.radioConsole.intelligence(nullableRow).geometry.key==='named');
check('runtime radio console injects base polish and favorites style links',serviceAssets.some(x=>x.href==='app-radio-console.css')&&serviceAssets.some(x=>x.href==='app-radio-console-polish.css')&&serviceAssets.some(x=>x.href==='app-favorites-ui.css'));
check('runtime radio console injects favorites behavior script',serviceAssets.some(x=>x.src==='app-favorites-ui.js'));

const guideLinks=[];
const guideRows=[
  {schedule_id:'a',frequency:600,score:null,distance_km:null,reception_class:'Gece DX',station:'A',transmitter_site_name:'Saha A'},
  {schedule_id:'b',frequency:700,score:72,distance_km:900,reception_class:'Bölgesel',station:'B'}
];
const guideR={
  me:{id:'u1'},favorites:[{user_id:'u1',guide_entry_id:'ga'}],
  router:{current:()=> 'home'},
  radioConsole:{rows:()=>guideRows,classKey:value=>value==='Gece DX'?'dx':value==='Bölgesel'?'regional':'unknown',guideMatch:row=>({id:row.schedule_id==='a'?'ga':'gb'})},
  events:{on(){}},features:{register(){}}
};
const guideDocument={querySelector(selector){if(selector==='link[data-mw-guide-css]')return null;return null},querySelectorAll(){return[]},createElement(){return{dataset:{}}},head:{appendChild(node){guideLinks.push(node)}},addEventListener(){}};
const guideSandbox={window:{R:guideR},R:guideR,document:guideDocument,Element:class{},globalThis:null,Number,String,Array,Object,Map,Set,Math,Date,Error,console,clearTimeout(){},setTimeout(){return 1},requestAnimationFrame(){}};
guideSandbox.globalThis=guideSandbox;
vm.createContext(guideSandbox);
vm.runInContext(guide,guideSandbox,{filename:'app-mw-guide-ui.js'});
check('runtime MW guide keeps null score in unknown class',guideR.mwGuideUI.scoreClass(null)==='unknown'&&guideR.mwGuideUI.scoreLabel(null)==='Puan yok');
const guideCounts=guideR.mwGuideUI.filterCounts();
check('runtime MW guide class counts reflect unfiltered rows',guideCounts.ALL===2&&guideCounts.dx===1&&guideCounts.regional===1);
check('runtime MW guide favorite count follows active user favorites',guideR.mwGuideUI.favoriteCount()===1);
guideR.mwGuideUI.favoriteOnly=true;
check('runtime MW guide favorite-only filter keeps only owned favorites',guideR.mwGuideUI.filtered().length===1&&guideR.mwGuideUI.filtered()[0].schedule_id==='a');
check('runtime MW guide injects its stylesheet',guideLinks.some(x=>x.href==='app-mw-guide.css'));

for(const [name,ok,detailText] of checks)console.log(`${ok?'✓':'✗'} ${name}${detailText?` — ${detailText}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} radio-console checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));