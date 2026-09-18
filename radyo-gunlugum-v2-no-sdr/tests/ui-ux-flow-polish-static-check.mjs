import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const names=read('app-ui-feature-names.js');
const uxCss=read('app-ui-ux-consistency.css');
new Function(names);

check('feature naming layer boots after UI UX consistency',bootstrap.indexOf("'app-ui-ux-consistency.js'")<bootstrap.indexOf("'app-ui-feature-names.js'"));
check('feature naming layer is cached by PWA',sw.includes("const UI_FEATURE_NAMING='20260917-15'")&&sw.includes("'./app-ui-feature-names.js'"));
check('audio workflow is named Ses Kaydı ve Döküm',names.includes("title:'Ses Kaydı ve Döküm'")&&names.includes('Ses örneği kaydet, yükle ve canlı konuşma dökümü oluştur'));
check('AI workflow is named Yapay zekâ analizi',names.includes("title:'Yapay zekâ analizi'")&&names.includes('Kaydedilmiş sesi Whisper ile analiz et'));
check('smart workflow is named Dinleme merkezi',names.includes("title:'Dinleme merkezi'")&&names.includes('Tarama oturumları, kadran kalibrasyonu ve çözülemeyen yayınlar'));
check('menu copy is updated through stable route actions',names.includes('`[data-action="${action}"]`'));
check('smart screen kicker reinforces sessions and calibration',names.includes('DİNLEME MERKEZİ · OTURUMLAR VE KALİBRASYON'));
check('AI screen kicker explicitly names on-device Whisper analysis',names.includes('YAPAY ZEKÂ ANALİZİ · CİHAZDA WHISPER'));
check('naming refresh survives menu, route and rerender events',names.includes("'menu:opened'")&&names.includes("'route:changed'")&&names.includes("'render:all'"));

check('quick log states that location name and coordinates are automatic',names.includes('Tarih, saat, konum adı ve koordinatlar otomatik eklenir'));
check('quick log explains that stored origin coordinates are saved',names.includes('için kayıtlı koordinatları da saklar'));
check('quick log location disclosure follows current listening-origin settings',names.includes('R.listeningOrigin?.()?.name')&&names.includes("'user:settings'"));
check('quick log disclosure is applied after the menu sheet is created',names.includes("R.events?.on?.('menu:opened'")&&names.includes('setTimeout(clarifyQuickLog,0)'));
check('quick log disclosure has readable themed styling',uxCss.includes('.app-quick-location-note')&&uxCss.includes('font-size:12.5px')&&uxCss.includes('html.night .app-quick-location-note'));
check('quick log disclosure ships with a PWA refresh marker',sw.includes("const QUICK_LOG_LOCATION_DISCLOSURE='20260917-16'"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} UI flow polish checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
