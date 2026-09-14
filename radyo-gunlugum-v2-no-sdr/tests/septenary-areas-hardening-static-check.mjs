import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)process.exitCode=1}
async function rejects(fn,part=''){try{await fn();return false}catch(error){return !part||String(error?.message||error).includes(part)}}

const ai=read('app-ai-service.js');
const listening=read('app-listening-service.js');
const intelligence=read('app-radio-intelligence.js');
const accessibility=read('app-modal-accessibility.js');
const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');

for(const [file,src] of [['app-ai-service.js',ai],['app-listening-service.js',listening],['app-radio-intelligence.js',intelligence],['app-modal-accessibility.js',accessibility]]){
  let ok=true,detail='';try{new vm.Script(src,{filename:file})}catch(error){ok=false;detail=error.message}
  check(`syntax ${file}`,ok,detail);
}

// AI analysis ownership, timing and exact-boundary handling.
check('AI fallback treats equal non-all-day ranges as inactive',ai.includes('if(a===b)return false'));
check('AI fallback without explicit time ranges only treats FM as always active',ai.includes("if(!e.time_ranges?.length)return e.mode==='FM'"));
check('AI candidate scoring reuses canonical target relevance',ai.includes('timing?.target?.score')&&ai.includes('timing.target?.why'));
check('AI personal station history excludes explicitly foreign account rows',ai.includes('!x.user_id||x.user_id===userId'));
check('AI analysis history probes beyond the exact 10000-row boundary',ai.includes('.range(MAX_ANALYSES,MAX_ANALYSES)'));
check('AI stale recovery catches invalid running timestamps',ai.includes('!Number.isFinite(ts)||ts<cutoff'));
check('AI audio path must be owned by the active account',ai.includes('audioPath.startsWith(`${userId}/`)'));
check('AI analyzing state is scoped to active account plus log id',ai.includes("activeAnalyses.has(`${R.me?.id||'none'}:${String(id)}`)"));

// Listening session integrity and bounded pagination.
check('listening attempts have an explicit 50000 row ceiling',listening.includes('MAX_ATTEMPTS=50000'));
check('listening attempt pagination probes one row past its exact limit',listening.includes("radio_session_attempts').select('id'")&&listening.includes('.range(limit,limit)'));
check('calibration pagination probes one row past its exact limit',listening.includes("radio_dial_calibrations').select('id'")&&listening.includes('.range(limit,limit)'));
check('session statistics only count known listening results',listening.includes("['heard','weak','none'].includes(x.result)"));
check('completed sessions reject new listening attempts',listening.includes("if(session.status!=='active')throw new Error('Bu dinleme oturumu tamamlanmış."));
check('listening fallback treats equal schedule ranges as inactive',listening.includes('if(a===b)return false'));
check('mystery matching scores the historical listening date and time',listening.includes("scoreEntry?.(e,{date:log?.date,time:log?.time})"));
check('mystery toggle verifies that a row was actually updated',listening.includes("update({is_mystery:next")&&listening.includes("select('id').maybeSingle()"));
check('dial estimation rejects invalid targets and unusable calibration points',listening.includes('x.y>0&&R.guideService?.receiverCompatible')&&listening.includes('if(!Number.isFinite(target)||target<=0)return null'));

// Radio-intelligence date, season and account boundaries.
check('radio intelligence validates real ISO dates',intelligence.includes("d.toISOString().slice(0,10)===raw"));
check('invalid explicit season dates do not become BNaN',intelligence.includes("if(!d)return''"));
check('season explanation distinguishes record season from selected date season',intelligence.includes('seçilen tarih ${expectedSeason} dönemine denk geliyor'));
check('season inventory is receiver-compatible only',intelligence.includes('R.guideService?.receiverCompatible?.(e)===false'));
check('transmitter routes exclude explicitly foreign account logs',intelligence.includes('log?.user_id&&log.user_id!==userId'));
check('season-aware guide expansion uses full guide ceiling rather than 20000',intelligence.includes("limit:50000"));

// Modal accessibility and privacy on account transitions.
check('modal accessibility module is booted',bootstrap.includes("'app-modal-accessibility.js'"));
check('modal accessibility module is cached',sw.includes("'./app-modal-accessibility.js'"));
check('modal layer traps Tab navigation',accessibility.includes("if(e.key!=='Tab')return")&&accessibility.includes('last.focus()')&&accessibility.includes('first.focus()'));
check('modal layer closes active listening dialog with Escape',accessibility.includes("if(e.key==='Escape')")&&accessibility.includes("dialog.id==='appListen'"));
check('modal layer closes account-sensitive listening UI on account change',accessibility.includes("R.events?.on?.('auth:changed'")&&accessibility.includes('R.listeningUI?.close?.()'));
check('listen overlay restores focus or focuses minimized control',accessibility.includes("#appListenMini [data-app-resume]")&&accessibility.includes('listenReturnFocus'));

// Functional AI candidate scoring and 10k boundary tests.
{
  const R={
    me:{id:'u1'},
    logs:[
      {id:'old1',user_id:'u1',band:'SW5',frequency:9500,station:'Near Europe'},
      {id:'old2',user_id:'u2',band:'SW5',frequency:9500,station:'Near Europe'}
    ],
    guideEntries:[
      {id:'near',entry_type:'station_target',station:'Near Europe',mode:'SW',band:'SW5',frequency:9500,probability_score:50,country:'G',language_content:'İngilizce'},
      {id:'far',entry_type:'station_target',station:'Far Domestic',mode:'SW',band:'SW5',frequency:9500,probability_score:50,country:'CHN',language_content:'Çince'}
    ],
    guideService:{
      receiverCompatible:()=>true,
      activeAt:()=>true,
      scoreEntry:e=>({active:true,valid:true,target:e.id==='near'?{score:8,why:'yakın hedef'}:{score:-30,why:'uzak iç hedef'}})
    },
    features:{register(){}},events:{emit(){},on(){}},clock:{today:()=> '2026-09-14'},norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),languageService:{detect:()=>null}
  };
  const emptyBuilder=()=>{const b={select(){return b},eq(){return b},order(){return b},in(){return b},update(){return b},range(){return Promise.resolve({data:[],error:null})}};return b};
  R.S={from:()=>emptyBuilder()};
  const sandbox={window:{R},navigator:{},globalThis:null,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0},performance:{now:()=>0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(ai,sandbox,{filename:'app-ai-service.js'});
  const log={id:'now',user_id:'u1',band:'SW5',frequency:9500,date:'2026-09-14',time:'14:00'};
  const cands=R.ai.candidateStations(log,'', 'Bilinmiyor');
  check('AI ranks Turkey-relevant target above foreign domestic target',cands[0]?.id==='near');
  check('AI station history evidence ignores foreign-account duplicate',cands.find(x=>x.id==='near')?.ai_evidence.some(x=>x.includes('geçmişinde 1 benzer kayıt var'))===true);

  const makePaged=total=>({from(){const b={select(){return b},eq(){return b},order(){return b},range(from,to){const count=Math.max(0,Math.min(total-1,to)-from+1);return Promise.resolve({data:Array.from({length:count},(_,i)=>({id:from+i+1,user_id:'u1',status:'completed'})),error:null})}};return b}});
  R.S=makePaged(10000);
  const exact=await R.ai.fetchAnalyses('u1');
  check('exactly 10000 AI analyses are accepted',exact.length===10000);
  R.S=makePaged(10001);
  check('10001st AI analysis is detected instead of silently truncated',await rejects(()=>R.ai.fetchAnalyses('u1'),'10.000'));

  R.S=makePaged(0);R.logs=[{id:'bad-audio',user_id:'u1',audio_path:'u2/foreign.webm',audio_duration_seconds:10}];
  check('AI refuses an audio object owned by another account',await rejects(()=>R.ai.analyze('bad-audio'),'ses dosyası açık hesaba ait değil'));
}

// Functional listening statistics, pagination and completed-session protection.
{
  let scoreOpts=null;
  const R={
    me:{id:'u1'},logs:[],guideEntries:[{id:'g1',entry_type:'station_target',mode:'SW',band:'SW5',frequency:9500,station:'Historical Radio',country:'G',language_content:'İngilizce',probability_score:50}],
    guideService:{receiverCompatible:()=>true,scoreEntry:(e,opts)=>{scoreOpts=opts;return{score:70}}},
    currentSuggestions:()=>[],radioNowCandidates:()=>[],clock:{local:()=>({date:'2026-09-14',time:'12:00'}),minutes:()=>720,parts:()=>({date:'2026-09-14'})},
    norm:v=>String(v??'').toLocaleLowerCase('tr-TR'),features:{register(){}},events:{emit(){},on(){}},reportError(){},load:async()=>{}
  };
  const noRows=()=>{const b={select(){return b},eq(){return b},order(){return b},limit(){return b},update(){return b},insert(){return b},delete(){return b},in(){return b},range(){return Promise.resolve({data:[],error:null})},maybeSingle(){return Promise.resolve({data:null,error:null})},single(){return Promise.resolve({data:null,error:null})}};return b};
  R.S={from:()=>noRows()};
  const sandbox={window:{R},globalThis:null,RADIO_APP_CONFIG:{origin:{name:'Bozköy, Torbalı, İzmir',lat:38.151,lon:27.36},timezone:'Europe/Istanbul'},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,Error,console,setTimeout(){return 0}};sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(listening,sandbox,{filename:'app-listening-service.js'});
  R.listening.state.attempts=[
    {session_id:'s1',result:'heard'},{session_id:'s1',result:'weak'},{session_id:'s1',result:'none'},{session_id:'s1',result:'mystery'}
  ];
  const stats=R.listening.sessionStats('s1');
  check('unknown attempt result does not distort session success rate',stats.total===3&&stats.receptions===2&&stats.successRate===67);
  R.listening.state.userId='u1';R.listening.state.sessions=[{id:'done',user_id:'u1',status:'completed'}];
  check('recording into a completed session is rejected before insert',await rejects(()=>R.listening.recordAttempt({id:'g1',mode:'SW',band:'SW5',frequency:9500,station:'X'},'heard',{sessionId:'done'}),'tamamlanmış'));
  R.listening.mysteryCandidates({id:'l1',band:'SW5',frequency:9500,date:'2026-05-01',time:'03:15',language:null,transcript:'',notes:'',program:''});
  check('mystery scoring uses original listening date and time',scoreOpts?.date==='2026-05-01'&&scoreOpts?.time==='03:15');

  const makePaged=total=>({from(){const b={select(){return b},eq(){return b},order(){return b},range(from,to){const count=Math.max(0,Math.min(total-1,to)-from+1);return Promise.resolve({data:Array.from({length:count},(_,i)=>({id:from+i+1,user_id:'u1'})),error:null})}};return b}});
  R.S=makePaged(2000);
  const calExact=await R.listening.fetchCalibrations(2000,'u1');
  check('exact calibration page boundary is accepted',!calExact.error&&calExact.data.length===2000);
  R.S=makePaged(2001);
  const calOver=await R.listening.fetchCalibrations(2000,'u1');
  check('one calibration beyond boundary is detected',!!calOver.error);
  R.S=makePaged(2000);
  const attemptExact=await R.listening.fetchAttempts(2000,'u1');
  check('exact attempt page boundary is accepted',!attemptExact.error&&attemptExact.data.length===2000);
  R.S=makePaged(2001);
  const attemptOver=await R.listening.fetchAttempts(2000,'u1');
  check('one attempt beyond boundary is detected without discarding newest rows',!!attemptOver.error&&attemptOver.data.length===2000);
}

// Functional radio season boundaries, invalid dates, receiver filtering and route account isolation.
{
  const R={
    me:{id:'u1'},
    logs:[
      {id:'a',user_id:'u1',station:'Route Radio',band:'SW5',frequency:9500,date:'2026-09-10'},
      {id:'b',user_id:'u2',station:'Route Radio',band:'SW5',frequency:9500,date:'2026-09-11'}
    ],
    guideEntries:[
      {id:'r1',entry_type:'station_target',station:'Route Radio',mode:'SW',band:'SW5',frequency:9500,language_content:'İngilizce',season:'A26',raw:{schedule:{latitude:50,longitude:10,tx_site_name:'Site',power_kw:100}}},
      {id:'bad',entry_type:'station_target',station:'Out of range',mode:'SW',band:'SW99',frequency:30000,language_content:'İngilizce',season:'A26'}
    ],
    guideService:{receiverCompatible:e=>e.id!=='bad',scoreEntry:()=>({score:70,active:false,why:[],history:{count:0}})},
    atlas:{origin:()=>({coords:[38.151,27.36],label:'Bozköy'}),distance:()=>1000,bearing:()=>270,direction:()=> 'batı'},
    radioNowCandidates:()=>[],clock:{today:()=> '2026-09-14'},features:{register(){}},events:{on(){}},norm:v=>String(v??'').toLocaleLowerCase('tr-TR')
  };
  const sandbox={window:{R},Date,Math,Number,String,Array,Object,Map,Set,Intl,console};
  vm.createContext(sandbox);vm.runInContext(intelligence,sandbox,{filename:'app-radio-intelligence.js'});
  check('day before A26 boundary remains B25',R.radioIntelligence.seasonFor('2026-03-28')==='B25');
  check('last Sunday of March starts A26',R.radioIntelligence.seasonFor('2026-03-29')==='A26');
  check('day before B26 boundary remains A26',R.radioIntelligence.seasonFor('2026-10-24')==='A26');
  check('last Sunday of October starts B26',R.radioIntelligence.seasonFor('2026-10-25')==='B26');
  check('impossible ISO date is rejected by season parser',R.radioIntelligence.seasonFor('2026-02-30')==='');
  check('season inventory excludes receiver-incompatible rows',R.radioIntelligence.availableSeasons().find(x=>x.season==='A26')?.count===1);
  const mismatch=R.radioIntelligence.explain({...R.guideEntries[0],season:'B26'},{date:'2026-09-14'});
  check('season explanation does not call B26 valid during A26 date',mismatch.reasons.some(x=>x.kind==='season'&&x.text.includes('seçilen tarih A26'))&&!mismatch.reasons.some(x=>x.kind==='season'&&x.text.includes('bu tarih için geçerli')));
  const routes=R.radioIntelligence.transmitterRoutes();
  check('transmitter route history excludes foreign account row',routes[0]?.count===1);
  let phaseOk=true;try{R.radioIntelligence.solarPhase([38.151,27.36],'2026-09-14')}catch{phaseOk=false}
  check('solar phase safely accepts a validated ISO date string',phaseOk);
}

for(const [name,ok,detail] of checks)console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`);
const failed=checks.filter(x=>!x[1]);
console.log(`\n${checks.length-failed.length}/${checks.length} septenary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));
