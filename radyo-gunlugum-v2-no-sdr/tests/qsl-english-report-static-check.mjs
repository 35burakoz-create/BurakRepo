import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const qsl=read('app-qsl-service.js');
const ui=read('app-qsl-ui.js');
const config=read('app-config.js');

for(const [file,src] of [['app-qsl-service.js',qsl],['app-qsl-ui.js',ui]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

const R={
  guideService:{wallTimeToInstant:(date,time)=>{
    if(date==='2026-09-10'&&time==='04:30')return new Date('2026-09-10T01:30:00Z');
    return new Date(`${date}T00:00:00Z`);
  }},
  features:{register(){}},
  events:{emit(){}}
};
const sandbox={window:{R},globalThis:null,Intl,Date,Math,Number,String,Array,Object,Promise,console};
sandbox.globalThis=sandbox;
sandbox.RADIO_APP_CONFIG={
  timezone:'Europe/Istanbul',
  origin:{name:'Bozköy, Torbalı, İzmir'},
  receiver:{model:'TECSUN R-9012'}
};
vm.createContext(sandbox);
vm.runInContext(qsl,sandbox,{filename:'app-qsl-service.js'});

const report=R.qslService.report({
  station:'Test Station',
  country:'Almanya',
  date:'2026-09-10',
  time:'04:30',
  band:'SW9',
  frequency:17650,
  unit:'kHz',
  location:'Bozköy, Torbalı, İzmir',
  language:'İngilizce / Mandarin Çincesi',
  signal_strength:4,
  program:'Station identification and interval signal',
  notes:'Duyum notu aynen korunsun.'
});

check('QSL report has a professional English title',report.startsWith('Reception Report and QSL Request\n\nDear Sir or Madam,'));
check('QSL report uses English field labels',['Station:','Country:','UTC date:','UTC time:','Local date:','Local time (Europe/Istanbul):','Frequency:','Reception site:','Receiver:','Broadcast language:','Signal strength:'].every(x=>report.includes(x)));
check('QSL report removes mixed Turkish timezone labels',!report.includes('Date (Türkiye)')&&!report.includes('Time (Türkiye')&&!report.includes('UTC+3'));
check('QSL report formats UTC as primary reference',report.includes('UTC date: 10 September 2026')&&report.includes('UTC time: 01:30 UTC'));
check('QSL report formats frequency without Turkish separators',report.includes('Frequency: 17650 kHz'));
check('QSL report normalizes localized country names to English',report.includes('Country: Germany'));
check('QSL report normalizes localized language names to English',report.includes('Broadcast language: English, Mandarin Chinese'));
check('QSL report describes signal without inventing SINPO',report.includes('Signal strength: 4/5 (good; personal listening scale)')&&report.includes('not a calibrated SINPO or S-meter reading'));
check('QSL report keeps logged reception evidence unchanged',report.includes('Duyum notu aynen korunsun.'));
check('QSL report has a courteous verification request',report.includes('confirm this reception with a QSL card or e-QSL')&&report.trim().endsWith('Kind regards'));

const sparse=R.qslService.report({station:'Sparse Station',date:'2026-09-10',time:'04:30',frequency:9500,band:'SW5'});
check('QSL report omits empty optional country and language fields',!sparse.includes('Country:')&&!sparse.includes('Broadcast language:'));
check('QSL helpers cover Turkish localized values',R.qslService.englishCountry('Amerika Birleşik Devletleri')==='United States'&&R.qslService.englishLanguage('Türkçe')==='Turkish');
check('QSL UI makes English output explicit',ui.includes('İngilizce raporu kopyala')&&ui.includes('İngilizce rapor metni')&&ui.includes('UTC tarih ve saat ana referanstır'));
const cache=config.match(/cacheVersion:'v385-core-boundary-[^']*20260910-(\d+)'/);
check('QSL English report has a fresh PWA generation',!!cache&&Number(cache[1])>=13);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} QSL English-report checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
