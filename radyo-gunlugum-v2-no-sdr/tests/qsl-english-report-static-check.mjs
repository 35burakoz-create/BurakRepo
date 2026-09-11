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
for(const [file,src] of [['app-qsl-service.js',qsl],['app-qsl-ui.js',ui]]){let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}check(`syntax ${file}`,ok)}

const R={guideService:{wallTimeToInstant:(date,time)=>date==='2026-09-10'&&time==='04:30'?new Date('2026-09-10T01:30:00Z'):new Date(`${date}T00:00:00Z`)},features:{register(){}},events:{emit(){}}};
const sandbox={window:{R},globalThis:null,Intl,Date,Math,Number,String,Array,Object,Set,Promise,console};sandbox.globalThis=sandbox;sandbox.RADIO_APP_CONFIG={timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir'},receiver:{model:'TECSUN R-9012'}};vm.createContext(sandbox);vm.runInContext(qsl,sandbox,{filename:'app-qsl-service.js'});

const report=R.qslService.report({station:'Test Station',country:'Almanya',date:'2026-09-10',time:'04:30',band:'SW9',frequency:17650,unit:'kHz',location:'Bozköy, Torbalı, İzmir',language:'İngilizce / Mandarin Çincesi',signal_strength:4,program:'Station identification and interval signal',notes:'Sinyal zayıf ve parazit vardı.'});
check('QSL report opens as a professional station letter',report.startsWith('Dear Test Station Team,'));
check('QSL report keeps UTC as the primary time reference',report.includes('• Date: 10 September 2026')&&report.includes('• Time: 01:30 UTC')&&!report.includes('Local time'));
check('QSL report formats frequency and receiver cleanly',report.includes('• Frequency: 17650 kHz')&&report.includes('• Receiver: TECSUN R-9012'));
check('QSL report normalizes localized country and language',report.includes('• Broadcaster country: Germany')&&report.includes('• Broadcast language: English, Mandarin Chinese'));
check('QSL report describes signal without inventing SINPO',report.includes('• Signal strength: 4/5 (good, personal listening scale)')&&report.includes('not a calibrated SINPO or S-meter measurement'));
check('Turkish free-form notes do not leak into English report',!report.includes('Sinyal zayıf')&&!report.includes('parazit vardı'));
check('English programme evidence is retained',report.includes('Station identification and interval signal'));
check('QSL request is courteous and conditional',report.includes('If your station still provides reception confirmations')&&report.trim().endsWith('Kind regards'));
const draft=R.qslService.emailDraft({station:'KBS WORLD Radio',date:'2026-09-10',time:'04:30',frequency:15575,unit:'kHz',band:'SW8'});
check('email draft has useful English subject and body',draft.subject.includes('Reception report – KBS WORLD Radio – 15575 kHz')&&draft.body.startsWith('Dear KBS WORLD Radio Team,'));
check('explicit English QSL details are preferred',R.qslService.programmeDetails({qsl_notes:'News bulletin followed by station identification.',notes:'Türkçe not burada.'})==='News bulletin followed by station identification.');
check('localized helper values remain English',R.qslService.englishCountry('Amerika Birleşik Devletleri')==='United States'&&R.qslService.englishLanguage('Türkçe')==='Turkish');
check('unknown localized labels are omitted rather than leaked',R.qslService.englishCountry('Bilinmeyen Ülke')===''&&R.qslService.englishLanguage('Bilinmeyen Dil')==='');
const kbs={station_name:'KBS WORLD Radio - English Service',aliases:['KBS World Radio','KBS WORLD Radio'],country:'South Korea'};
check('contact scoring recognizes exact station aliases',R.qslService.contactScore(kbs,{station:'KBS World Radio',country:'Güney Kore'})>=100);
check('QSL UI exposes verified contact lookup',ui.includes('İletişim öner')&&ui.includes('E-posta taslağını aç')&&ui.includes('Resmî formu aç'));
check('QSL UI exposes English-only programme details',ui.includes('English programme details (optional)')&&ui.includes('Türkçe serbest metin'));
check('contact service queries curated station directory',qsl.includes("from('radio_station_contacts')")&&qsl.includes('suggestContact')&&qsl.includes('saveContact'));
const cache=config.match(/cacheVersion:'v385-core-boundary-[^']*-(\d{8})-(\d+)'/);check('QSL contact release has fresh PWA generation',!!cache&&Number(cache[1])>=20260910&&Number(cache[2])>=14);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} QSL English/contact checks passed.`);if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
