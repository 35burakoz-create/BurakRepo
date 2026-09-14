import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const quick=fs.readFileSync(path.join(root,'app-quick-log.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app-quick-log.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}

let syntax=true,syntaxDetail='';
try{new vm.Script(quick,{filename:'app-quick-log.js'})}catch(error){syntax=false;syntaxDetail=error.message}
check('quick log module syntax',syntax,syntaxDetail);

check('quick log loads its dedicated visual stylesheet',quick.includes("l.href='app-quick-log.css'")&&quick.includes('data-quick-log-css'));
check('quick log stylesheet loading is safe in reduced test DOMs',quick.includes("typeof document==='undefined'")&&quick.includes("typeof document.createElement!=='function'"));
check('quick log does not invent a default signal value',quick.includes('let sig=null,saving=false,persisted=false'));
check('quick log signal buttons begin unselected',quick.includes('aria-pressed="false"')&&quick.includes('Sinyal gücü <span>isteğe bağlı</span>'));
check('quick log signal selection can be cleared by pressing the active value again',quick.includes('sig=sig===n?null:n'));
check('quick log uses a real form so Enter can submit',quick.includes('<form id="qForm"')&&quick.includes('type="submit"')&&quick.includes('form.onsubmit=async'));
check('quick log exposes frequency units and guidance',quick.includes('qFreqUnit')&&quick.includes('qFreqHelp')&&quick.includes('unitFor(band)'));
check('quick log requires the canonical frequency validator',quick.includes("typeof R.validateFrequency!=='function'")&&quick.includes('Frekans doğrulama servisi henüz hazır değil'));
check('online quick log cannot silently succeed without record service',quick.includes("typeof R.records?.save!=='function'")&&quick.includes('Kayıt servisi henüz hazır değil')&&quick.includes('return R.records.save(body)'));
check('offline quick log cannot silently succeed without queue service',quick.includes("typeof R.queueLog!=='function'")&&quick.includes('Çevrimdışı kayıt kuyruğu henüz hazır değil')&&quick.includes('return R.queueLog(body)'));
check('quick log keeps persistence and refresh failures separate',quick.includes("'quick-log-refresh'")&&quick.includes("'quick-log-save'")&&quick.includes('persisted=true'));
check('quick log completion closes only the sheet that initiated the save',quick.includes('function currentSheet(sheet)')&&quick.includes('if(currentSheet(s))R.menuUI.close();else R.toast?.'));
check('quick log detailed transition preserves entered draft fields',quick.includes("setField('band',draft.band)")&&quick.includes("setField('frequency',draft.frequency)")&&quick.includes("setField('station',draft.station)")&&quick.includes("setField('signal',draft.signal??'')")&&quick.includes("setField('notes',draft.note)"));
check('quick log fallback time is pinned to configured Istanbul timezone',quick.includes("C.timezone||'Europe/Istanbul'")&&quick.includes("timeZone:'Europe/Istanbul'"));
check('quick log keeps free text bounded',quick.includes('maxlength="180"')&&quick.includes('maxlength="500"'));
check('quick log focuses the frequency field when opened',quick.includes("s.querySelector('#qFreq')?.focus?.()"));
check('quick log visual asset is in the service worker cache list',sw.includes("'./app-quick-log.css'"));

check('quick log sheet has a bounded desktop width',css.includes('#v38Sheet.app-quick-sheet{width:min(560px'));
check('quick log signal controls override dark listening-button defaults',css.includes('.app-quick-signal button{')&&css.includes('background:#f8fafc')&&css.includes('color:#475569'));
check('quick log signal controls expose a distinct selected treatment',css.includes('.app-quick-signal button.active')&&css.includes('background:#4f46e5'));
check('quick log signal controls meet touch target sizing',css.includes('min-height:48px'));
check('quick log frequency input keeps the unit visually attached',css.includes('.app-quick-frequency{display:grid')&&css.includes('border-radius:12px 0 0 12px'));
check('quick log actions are balanced and large enough',css.includes('.app-quick-actions{display:grid')&&css.includes('min-height:48px!important'));
check('quick log mobile layout becomes a single column',css.includes('@media(max-width:520px)')&&css.includes('.app-quick-grid{grid-template-columns:1fr}')&&css.includes('.app-quick-actions{grid-template-columns:1fr}'));
check('quick log has explicit night-mode surfaces',css.includes('.night-mode .app-quick-signal button')&&css.includes('html.night .app-quick-frequency>span'));
check('quick log respects reduced-motion preference',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('transition:none!important'));

// Functional helper checks: data accuracy, ownership-independent fallback and persistence-provider safety.
{
  const fields=new Map(),links=[];
  const currentSheet={isConnected:true};
  const document={
    head:{appendChild(node){links.push(node)}},
    querySelector(selector){if(selector==='#v38Sheet')return currentSheet;if(selector.startsWith('#'))return fields.get(selector.slice(1))||null;return null},
    createElement(){return{dataset:{}}},
    addEventListener(){}
  };
  let resetCount=0,unitCount=0,onlineSaves=0,queuedSaves=0;
  const R={
    me:{id:'u1'},B:['FM','MW','FM'],
    listeningOrigin:()=>({name:'Bozuk',lat:999,lon:999}),
    clock:{local:()=>({date:'2026-09-14',time:'16:43'})},
    fill:(id,value)=>fields.set(id,{value}),reset:()=>{resetCount++},unit:()=>{unitCount++},
    features:{register(){}},events:{on(){}},esc:String,
    validateFrequency:(band,value)=>band==='SW3'&&Number(value)===9.5?{ok:true,value:9500}:{ok:Number(value)>0,value:Number(value),message:'bad'}
  };
  const sandbox={window:{R},document,R,navigator:{onLine:true},RADIO_APP_CONFIG:{timezone:'Europe/Istanbul',origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36},receiver:{bands:{FM:{},MW:{},SW3:{}}}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0}};
  vm.createContext(sandbox);vm.runInContext(quick,sandbox,{filename:'app-quick-log.js'});
  const Q=R.quickLog;

  check('functional quick log stylesheet injection runs once',links.length===1&&links[0].href==='app-quick-log.css');
  check('functional quick log deduplicates receiver bands',JSON.stringify(Q.availableBands())===JSON.stringify(['FM','MW']));
  check('functional quick log labels FM in MHz and other bands in kHz',Q.unitFor('FM')==='MHz'&&Q.unitFor('SW3')==='kHz');
  check('functional quick log rejects implicit and corrupt signal values',Q.normalizeSignal(null)===null&&Q.normalizeSignal(undefined)===null&&Q.normalizeSignal(99)===null);
  check('functional quick log preserves an explicit personal signal value',Q.normalizeSignal('4')===4);
  check('functional quick log corrupt listening origin falls back to Bozkoy',Q.origin().name==='Bozköy, Torbalı, İzmir'&&Q.origin().lat===38.151&&Q.origin().lon===27.36);
  check('functional quick log uses application clock for saved timestamp',Q.localNow().date==='2026-09-14'&&Q.localNow().time==='16:43');
  const body=Q.makeBody({userId:'u1',band:'MW',frequency:1000,station:'  Test  ',note:'  kısa not  '});
  check('functional quick log body does not fabricate signal',body.signal_strength===null);
  check('functional quick log body trims optional text',body.station==='Test'&&body.notes==='kısa not');
  check('functional quick log body pins configured origin coordinates',body.latitude===38.151&&body.longitude===27.36);
  check('functional quick log canonical SW MHz normalization is reusable',Q.validateQuickFrequency('SW3',9.5).value===9500);

  let onlineError=null;try{await Q.persist(body,{offline:false})}catch(error){onlineError=error}
  check('functional quick log refuses fake online success without persistence provider',/Kayıt servisi/.test(onlineError?.message||''));
  let offlineError=null;try{await Q.persist(body,{offline:true})}catch(error){offlineError=error}
  check('functional quick log refuses fake offline success without queue provider',/kuyruğu/.test(offlineError?.message||''));
  R.records={save:async value=>{onlineSaves++;return value}};R.queueLog=async value=>{queuedSaves++;return value};
  await Q.persist(body,{offline:false});await Q.persist(body,{offline:true});
  check('functional quick log routes online and offline persistence exactly once',onlineSaves===1&&queuedSaves===1);
  check('functional quick log identifies only the currently connected originating sheet',Q.currentSheet(currentSheet)===true&&Q.currentSheet({isConnected:true})===false&&Q.currentSheet({isConnected:false})===false);

  Q.applyDetailedDraft({band:'SW3',frequency:9500,station:'Aktarılan',signal:4,note:'Not'});
  check('functional detailed transition resets the long form first',resetCount===1);
  check('functional detailed transition transfers quick fields',fields.get('band')?.value==='SW3'&&fields.get('frequency')?.value===9500&&fields.get('station')?.value==='Aktarılan'&&fields.get('signal')?.value===4&&fields.get('notes')?.value==='Not');
  check('functional detailed transition refreshes band unit after transfer',unitCount===1);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} quick-log hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
