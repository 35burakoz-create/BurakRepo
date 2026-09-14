import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const log=read('app-log-ui.js');
const form=read('app-log-form-ui.js');
const css=read('app-log-form.css');
const sw=read('sw.js');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}
for(const [name,src] of [['app-log-ui.js',log],['app-log-form-ui.js',form]]){let ok=true,detail='';try{new vm.Script(src,{filename:name})}catch(error){ok=false;detail=error.message}check(`syntax ${name}`,ok,detail)}

check('journal isolates active account rows',log.includes('function ownedLogs()')&&log.includes('x.user_id===userId'));
check('journal rejects malformed legacy signal values',log.includes('Number.isInteger(n)&&n>=1&&n<=5'));
check('journal rejects malformed audio paths',log.includes("typeof v==='string'&&!!v.trim()"));
check('journal frequency renderer refuses NaN and non-positive values',log.includes("if(!Number.isFinite(f)||f<=0)return''"));
check('journal unknown legacy status is not mislabeled as candidate',log.includes("return{label:'Durum bilinmiyor',className:'muted'}"));
check('journal metadata omits blank separators',log.includes('function metaParts(x)')&&log.includes("[date,time].filter(Boolean).join(' ')"));
check('journal filter state counts only non-empty controls',log.includes('function filterState()')&&log.includes('Object.values(values).filter'));
check('journal filter clear also clears persisted account UI state',log.includes("R.uiStatePersistence?.setFilter?.(id,'')"));
check('journal shows a clear-filter action in filtered empty state',log.includes('Bu filtrelerle eşleşen kayıt yok.')&&log.includes('data-log-clear'));
check('journal visible result summary is a polite live region',log.includes('id="appLogResultSummary" role="status" aria-live="polite"'));
check('journal filter button exposes active filter count',log.includes('id="appLogFilterCount"')&&log.includes('count.hidden=!fs.count'));
check('journal record expansion survives rerender by record id',log.includes('expandedIds=new Set()')&&log.includes("expandedIds.has(String(c.dataset.recordId||''))"));
check('journal record headers remain keyboard operable',log.includes('role="button" tabindex="0" aria-expanded="false"')&&log.includes("['Enter',' '].includes(e.key)"));
check('journal progressive pagination remains bounded at 100 rows per step',log.includes('visibleCount=100')&&log.includes('visibleCount+=100'));
check('journal duplicate delete actions are coalesced',log.includes('deleteFlights=new Map()')&&log.includes('deleteFlights.has(key)')&&log.includes('deleteFlights.set(key,flight)'));
check('journal delete pins the initiating account',log.includes('const userId=R.me?.id')&&log.includes("if(R.me?.id!==userId)return true"));
check('journal delete distinguishes delete success from refresh failure',log.includes("'log-delete-refresh'")&&log.includes('Kayıt silindi; günlük listesi şu anda yenilenemedi.'));
check('journal audio playback is account-pinned after URL creation',log.includes('const signer=R.records?.signedAudioUrl?.bind(R.records)')&&log.includes("if(R.me?.id!==userId){w?.close?.();return null}"));
check('journal delegated clicks tolerate non-Element targets',log.includes('e.target instanceof Element?e.target:null'));

check('journal form validates listening-origin coordinate ranges',form.includes('function validCoords(lat,lon)')&&form.includes('lat>=-90&&lat<=90')&&form.includes('lon>=-180&&lon<=180'));
check('journal form falls back to configured Bozkoy origin',form.includes('function configuredOrigin()')&&form.includes("name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36"));
check('journal form edit lookup is active-account scoped',form.includes('function ownedRecord(id,userId=activeUserId())')&&form.includes('!x.user_id||x.user_id===userId'));
check('journal form body refuses stale foreign edit targets',form.includes("if(id&&!old)throw new Error('Düzenlenecek kayıt bulunamadı veya bu hesaba ait değil.')"));
check('journal form fallback clock uses configured Istanbul timezone',form.includes("C.timezone||'Europe/Istanbul'")&&form.includes("timeZone:'Europe/Istanbul'"));
check('journal form exposes a close action for new records',form.includes("cancel.textContent=editing?'Düzenlemeyi iptal et':'Kapat'"));
check('journal form opening and closing have explicit lifecycle helpers',form.includes("function showForm(mode='new'")&&form.includes('function hideForm('));
check('journal new-record action delegates to form lifecycle',log.includes("R.logFormUI?.showForm")&&log.includes("R.logFormUI.showForm('new')"));
check('journal form still coalesces account save requests',form.includes('saveFlights=new Map()')&&form.includes('saveFlights.has(userId)'));
check('journal form requires the canonical record save service',form.includes('const saveRecord=R.records?.save?.bind(R.records)')&&form.includes("typeof saveRecord!=='function'"));
check('journal form separates persistence success from list refresh',form.includes('persisted=true')&&form.includes("'log-form-refresh'")&&form.includes("'log-form-save'"));
check('journal form reports saved-but-not-refreshed state accurately',form.includes('Kayıt kaydedildi; günlük listesi şu anda yenilenemedi.'));
check('journal form message helper has explicit success and error states',form.includes("type==='error'")&&form.includes("type==='success'"));
check('journal cancel remains blocked during active save',form.includes('if(cancel)cancel.disabled=true')&&form.includes('if(!isSaving())reset()'));

check('journal stylesheet is cached for installed PWA',sw.includes("'./app-log-form.css'"));
check('journal closed form lets records use full desktop width',css.includes('#tab-log:not(.v38-form-open) .two-col{grid-template-columns:minmax(0,1fr)!important}'));
check('journal open desktop form restores two-column workspace',css.includes('html[data-ui-mode="desktop"] #tab-log.v38-form-open .two-col')&&css.includes('minmax(340px,.9fr) minmax(0,1.35fr)'));
check('journal stats collapse safely on smaller screens',css.includes('@media(max-width:760px)')&&css.includes('#tab-log .stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}'));
check('journal filter surface has responsive columns',css.includes('.records-card .filters')&&css.includes('@media(max-width:560px)')&&css.includes('grid-template-columns:1fr!important'));
check('journal record title and metadata wrap long content',css.includes('.record-title')&&css.includes('overflow-wrap:anywhere')&&css.includes('.record-meta'));
check('journal expanded cards have a distinct visual state',css.includes('.record-card.v38-expanded')&&css.includes('border-color:#c7d2fe'));
check('journal action buttons meet touch target sizing',css.includes('.record-actions .btn{min-height:44px!important'));
check('journal destructive action has an explicit visual treatment',css.includes('.record-actions .danger')&&css.includes('var(--log-danger)'));
check('journal transcript and notes wrap without horizontal overflow',css.includes('.app-log-transcript')&&css.includes('white-space:pre-wrap')&&css.includes('.app-log-notes'));
check('journal filter empty state is visually distinct',css.includes('.app-log-empty')&&css.includes('border:1px dashed'));
check('journal frequency input and unit focus as one control',css.includes('.inline-input:focus-within')&&css.includes('border-color:#a5b4fc'));
check('journal advanced details use a full touch row',css.includes('.app-log-advanced>summary')&&css.includes('min-height:46px'));
check('journal form messages have distinct error and success colors',css.includes('#formMsg.is-error')&&css.includes('#formMsg.is-success'));
check('journal mobile controls avoid browser zoom',css.includes('@media(max-width:680px)')&&css.includes('font-size:16px!important'));
check('journal very narrow action grids stack instead of crushing labels',css.includes('@media(max-width:380px)')&&css.includes('.record-card.v38-expanded .record-actions{grid-template-columns:1fr}'));
check('journal night mode covers filters cards notes and errors',css.includes('html.night #tab-log .records-card .filters')&&css.includes('html.night #tab-log .record-card')&&css.includes('html.night #tab-log .app-log-notes')&&css.includes('html.night #tab-log #formMsg.is-error'));
check('journal reduced-motion preference removes disclosure animation',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('transition:none!important'));

// Lightweight functional checks for corrupted legacy data and account isolation.
{
  const nodes=new Map();
  const document={querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener(){},createElement(){return{dataset:{},appendChild(){},setAttribute(){}}}};
  const R={me:{id:'u1'},logs:[
    {id:'1',user_id:'u1',band:'FM',frequency:95.0,status:'confirmed',audio_path:'u1/a.webm'},
    {id:'2',user_id:'u1',band:'SW3',frequency:'bad',status:'legacy',audio_path:'   '},
    {id:'3',user_id:'u2',band:'MW',frequency:1000,status:'candidate'}
  ],B:['FM','MW','SW3'],features:{register(){}},events:{on(){}},router:{current:()=>''},norm:v=>String(v??'').toLowerCase(),esc:String,uiStatePersistence:{setFilter(){}}};
  const sandbox={window:{R,open(){return null}},document,R,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0},clearTimeout(){},confirm(){return false},CSS:{escape:String},Element:class{},globalThis:null};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(log,sandbox,{filename:'app-log-ui.js'});
  check('functional journal keeps only active account and ownerless legacy rows',R.logUI.ownedLogs().length===2);
  check('functional journal valid frequency renders with FM unit',R.logUI.displayFrequency(R.logs[0]).includes('MHz'));
  check('functional journal malformed frequency renders blank instead of NaN',R.logUI.displayFrequency(R.logs[1])==='');
  check('functional journal unknown status stays explicitly unknown',R.logUI.statusInfo('legacy').label==='Durum bilinmiyor');
  check('functional journal blank audio path is not treated as an attachment',R.logUI.validAudioPath('   ')===false&&R.logUI.validAudioPath('u1/a.webm')===true);
}

{
  const links=[];
  const document={head:{appendChild:n=>links.push(n)},querySelector(){return null},createElement(){return{dataset:{}}}};
  const R={me:{id:'u1'},logs:[{id:'mine',user_id:'u1'},{id:'foreign',user_id:'u2'},{id:'legacy'}],B:[],features:{register(){}},events:{on(){}},router:{register(){}},listeningOrigin:()=>({name:'Bozuk',lat:999,lon:999})};
  const sandbox={window:{R,scrollTo(){}},document,R,navigator:{onLine:true},RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0},globalThis:null};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(form,sandbox,{filename:'app-log-form-ui.js'});
  check('functional journal form stylesheet injection remains single-purpose',links.length===1&&links[0].href==='app-log-form.css');
  check('functional journal form edit lookup rejects foreign account row',R.logFormUI.ownedRecord('foreign','u1')===null);
  check('functional journal form edit lookup keeps owned and ownerless legacy rows',R.logFormUI.ownedRecord('mine','u1')?.id==='mine'&&R.logFormUI.ownedRecord('legacy','u1')?.id==='legacy');
  const o=R.logFormUI.origin();
  check('functional journal form invalid preference origin falls back to Bozkoy',o.name==='Bozköy, Torbalı, İzmir'&&o.lat===38.151&&o.lon===27.36);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} journal hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
