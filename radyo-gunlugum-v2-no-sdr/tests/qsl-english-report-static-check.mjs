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
const integrity=read('app-ui-integrity.css');
const logForm=read('app-log-form-ui.js');
const logUi=read('app-log-ui.js');
const logFormCss=read('app-log-form.css');
const index=read('index.html');
for(const [file,src] of [['app-qsl-service.js',qsl],['app-qsl-ui.js',ui],['app-log-form-ui.js',logForm],['app-log-ui.js',logUi]]){let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}check(`syntax ${file}`,ok)}

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
check('QSL UI exposes verified contact lookup',ui.includes('İletişim bilgisi bul')&&ui.includes('E-posta taslağını aç')&&ui.includes('Resmî formu aç'));
check('QSL UI exposes English-only programme details',ui.includes('Program ayrıntıları (İngilizce, isteğe bağlı)')&&ui.includes('Bu alan İngilizce olmalıdır'));
check('contact service queries curated station directory',qsl.includes("from('radio_station_contacts')")&&qsl.includes('suggestContact')&&qsl.includes('saveContact'));
check('QSL UI explains backward correction and exposes reset',ui.includes('Durumu düzeltmek için doğru aşamaya dokun.')&&ui.includes('Süreci sıfırla')&&ui.includes('data-qsl-action="none"'));
check('QSL UI renders sent and received dates near status',ui.includes('qsl_sent_at')&&ui.includes('qsl_received_at')&&ui.includes('app-qsl-status-dates'));
check('QSL step and reset controls keep 44px mobile targets',integrity.includes('.app-qsl-step{')&&integrity.includes('min-height:44px')&&integrity.includes('.app-qsl-reset{min-height:44px!important')&&integrity.includes('.app-qsl-reset{width:100%}'));
check('log form uses consistent QSL status labels',index.includes('<option value="none">Başlatılmadı</option>')&&index.includes('<option value="planned">Planlandı</option>')&&!index.includes('<option value="none">Yok</option>'));
check('log form labels qsl_notes as English programme details',index.includes('Program ayrıntıları (İngilizce)')&&index.includes('Bu alan İngilizce QSL raporunda kullanılır.'));
check('log form exposes live tracking guidance',index.includes('id="qslTrackingHint"')&&logForm.includes('function syncQslFields')&&logForm.includes("qslStatus.addEventListener('change'"));
check('log form disables inactive QSL dates and keeps 44px controls',logFormCss.includes('#tab-log .qsl-fieldset input:disabled')&&logFormCss.includes('#tab-log .qsl-fieldset input,#tab-log .qsl-fieldset select{min-height:44px}'));
check('log form blocks Turkish text from English QSL details',logForm.includes("QSL program ayrıntılarını İngilizce yaz. Türkçe metin İngilizce rapora eklenmez."));
check('journal QSL action uses canonical QSL record focus helper',logUi.includes("R.qslUI?.focusRecord?.(q.dataset.qsl)")&&!logUi.includes('data-qsl-id'));
check('QSL focus helper targets canonical data-qslitem records',ui.includes('function focusRecord(id)')&&ui.includes('[data-qslitem=')&&ui.includes("closest?.('.app-qsl-backlog')")&&ui.includes('backlog.open=true'));
check('QSL navigated target receives visible focus treatment',integrity.includes('.qsl-item.app-qsl-focus,.app-qsl-backlog-row.app-qsl-focus')&&integrity.includes('scroll-margin-block:96px'));

const noneDraft=R.qslService.normalizeTrackingDraft('none','2026-09-10','2026-09-20','2026-09-21');
check('QSL draft none clears both dates',noneDraft.qsl_sent_at===null&&noneDraft.qsl_received_at===null);
const plannedDraft=R.qslService.normalizeTrackingDraft('planned','2026-09-10','2026-09-20','2026-09-21');
check('QSL draft planned clears both dates',plannedDraft.qsl_sent_at===null&&plannedDraft.qsl_received_at===null);
const sentDraft=R.qslService.normalizeTrackingDraft('sent',null,'2026-09-20','2026-09-21');
check('QSL draft sent defaults sent date and clears response',sentDraft.qsl_sent_at==='2026-09-21'&&sentDraft.qsl_received_at===null);
const receivedDraft=R.qslService.normalizeTrackingDraft('received','2026-09-10',null,'2026-09-21');
check('QSL draft received preserves sent date and defaults response',receivedDraft.qsl_sent_at==='2026-09-10'&&receivedDraft.qsl_received_at==='2026-09-21');
let reverseRejected=false;try{R.qslService.normalizeTrackingDraft('received','2026-09-22','2026-09-21','2026-09-21')}catch{reverseRejected=true}
check('QSL draft rejects response before sent date',reverseRejected);

let statusPatch=null;
R.me={id:'user-1'};
R.clock={today:()=> '2026-09-21'};
R.load=async()=>{};
R.S={from(table){check('QSL status writes target radio_logs',table==='radio_logs');return{update(patch){statusPatch=patch;const chain={eq(){return chain},select(){return chain},async maybeSingle(){return{data:{id:'log-1',user_id:'user-1',...patch},error:null}}};return chain}}}};
await R.qslService.setStatus('log-1','none');
check('QSL reset returns status to none',statusPatch?.qsl_status==='none');
check('QSL reset clears sent and received dates',statusPatch?.qsl_sent_at===null&&statusPatch?.qsl_received_at===null);
let invalidRejected=false;try{await R.qslService.setStatus('log-1','invalid')}catch{invalidRejected=true}
check('QSL status service still rejects unknown states',invalidRejected);
const cache=config.match(/cacheVersion:'v385-core-boundary-[^']*-(\d{8})-(\d+)'/);check('QSL contact release has fresh PWA generation',!!cache&&Number(cache[1])>=20260910&&Number(cache[2])>=14);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} QSL English/contact checks passed.`);if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
