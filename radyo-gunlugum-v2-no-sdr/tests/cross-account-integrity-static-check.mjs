import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const index=read('index.html');
const sw=read('sw.js');
const menu=read('app-menu-ui.js');
const qslService=read('app-qsl-service.js');
const qslUI=read('app-qsl-ui.js');
const audioSafety=read('app-audio-safety.js');
const memory=read('app-memory.js');
const smart=read('app-smart-analyzer.js');
const collection=read('app-collection-ui.js');
const aiService=read('app-ai-service.js');
const aiUI=read('app-ai-ui.js');

for(const [file,src] of [['sw.js',sw],['app-menu-ui.js',menu],['app-qsl-service.js',qslService],['app-qsl-ui.js',qslUI],['app-audio-safety.js',audioSafety],['app-memory.js',memory],['app-smart-analyzer.js',smart],['app-collection-ui.js',collection],['app-ai-service.js',aiService],['app-ai-ui.js',aiUI]]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

const SUPABASE_CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0';
check('browser Supabase client is pinned to an exact version',index.includes(`<script src="${SUPABASE_CDN}"></script>`));
check('service worker caches the same pinned Supabase version',sw.includes(`'${SUPABASE_CDN}'`));
check('floating Supabase @2 CDN reference is retired',!index.includes('supabase-js@2"></script>')&&!sw.includes("supabase-js@2','"));

check('menu click delegation tolerates non-Element event targets',menu.includes("const target=e.target,menuButton=target?.closest?.('[data-menu]')"));
check('menu reminder toggle blocks duplicate clicks',menu.includes("if(!b||b.dataset.busy==='1')return")&&menu.includes("b.dataset.busy='1';b.disabled=true"));
check('menu reminder toggle pins the initiating account',menu.includes('const userId=R.me?.id,reminderId=b.dataset.reminder')&&menu.includes(".eq('user_id',userId)"));
check('menu reminder result is ignored after account switch',menu.includes('if(R.me?.id!==userId||!b.isConnected)return'));

check('QSL service captures account identity before writes',qslService.includes('function currentUser()')&&qslService.includes('const userId=currentUser()'));
check('QSL service reload is account-gated',qslService.includes('async function reloadFor(userId)')&&qslService.includes('if(R.me?.id!==userId)return false'));
check('QSL service status event cannot cross accounts',qslService.includes('if(!await reloadFor(userId))return')&&qslService.includes("emit?.('qsl:updated',{id,status,row:q.data||null,userId})"));
check('QSL mutations reject zero-row ownership mismatches',qslService.includes("if(!q.data)throw new Error('Kayıt bulunamadı veya bu hesaba ait değil.')"));

check('QSL UI uses safe delegated click lookup',qslUI.includes("e.target?.closest?.('[data-qsl-action]')"));
check('QSL UI pins async actions to the opening account',qslUI.includes('async function act(button){const userId=R.me?.id')&&qslUI.includes('if(R.me?.id!==userId)return'));
check('QSL UI blocks duplicate mutations',qslUI.includes("if(button.dataset.busy==='1')return")&&qslUI.includes("button.dataset.busy='1'"));
check('QSL contact suggestions ignore stale account completion',qslUI.includes('async function suggest(button,log){const userId=R.me?.id')&&qslUI.includes('if(R.me?.id!==userId)return;contactResults.set'));
check('QSL contact cache clears on account change',qslUI.includes("R.events?.on?.('auth:changed',x=>{contactResults.clear()"));

check('audio archive pagination pins one account for all pages',audioSafety.includes('async function listAudioFiles(userId=R.me?.id)')&&audioSafety.includes(".list(userId,{limit:AUDIO_PAGE_SIZE"));
check('audio archive pagination aborts on account change',audioSafety.includes("throw new Error('Oturum değişti; ses arşivi taraması durduruldu.')"));
check('orphan audio paths are built with pinned account id',audioSafety.includes('path:`${userId}/${x.name}`'));
check('audio attachment validates owning account and path prefix',audioSafety.includes("if(!String(path||'').startsWith(`${userId}/`))")&&audioSafety.includes("if(log.user_id&&log.user_id!==userId)"));
check('audio recovery signed URL cannot open after account switch',audioSafety.includes('if(R.me?.id===userId&&p.isConnected)window.open'));
check('audio recovery modal closes on authenticated account switch',audioSafety.includes('changedAccount=!!x?.previousUserId&&x.previousUserId!==userId')&&audioSafety.includes("closeModal();$('#appAudioActions')?.remove()"));
check('audio recovery click delegation tolerates non-Element targets',audioSafety.includes("const target=e.target,p=target?.closest?.('[data-audio-play]')"));

check('Radio Memory state storage is account-scoped',memory.includes("KEY='radio-memory-v373'")&&memory.includes('`${KEY}:${userId}`'));
check('legacy global Radio Memory state is retired',memory.includes("localStorage.removeItem(LEGACY_KEY)"));
check('Radio Memory attempt pagination pins one account',memory.includes('async function loadAttempts(userId=R.me?.id)')&&memory.includes(".eq('user_id',userId)"));
check('Radio Memory attempt pagination stops applying stale account rows',memory.includes('if(R.me?.id!==userId)return[]')&&memory.includes('if(R.me?.id===userId){attempts=out;attemptsUserId=userId}'));
check('Radio Memory only uses cached attempts for the active account',memory.includes("attemptsUserId!==R.me?.id")&&memory.includes('R.listening?.state?.userId===userId'));
check('Radio Memory resets account state immediately on auth change',memory.includes("R.events?.on?.('auth:changed',x=>{attempts=null;attemptsUserId=null")&&memory.includes('readState(userId):blankState()'));
check('Radio Memory delegated menu click tolerates non-Element targets',memory.includes("e.target?.closest?.('[data-v38menu]')"));
check('Radio Memory ignores invalid legacy hours in best-hour summary',memory.includes('Number.isFinite(h)&&h>=0&&h<=23'));

check('smart analyzer delegated click tolerates non-Element targets',smart.includes("e.target?.closest?.('[data-smart-apply]')"));
check('smart analyzer clears stale candidate state on account change',smart.includes("R.lastSmart=null")&&smart.includes("x.previousUserId!==x?.user?.id"));

check('collection open is pinned to the account that requested it',collection.includes('async function open(){const userId=R.me?.id')&&collection.includes('if(R.me?.id!==userId)return null'));
check('collection modal closes on authenticated account switch',collection.includes("R.events?.on?.('auth:changed',x=>")&&collection.includes('close({restoreFocus:false})'));
check('collection country navigation cannot continue in another account',collection.includes("if(R.me?.id!==userId){close({restoreFocus:false});return}"));

check('AI service clears user state immediately on account switch',aiService.includes('function clearUserState()')&&aiService.includes('if(!x?.authenticated||changedAccount)clearUserState()'));
check('AI service scopes loaded data events to the active account',aiService.includes("emit?.('ai:data',{count:state.analyses.length,userId})"));
check('AI service guards completion and error events by account',aiService.includes("emit?.('ai:analysis-complete',{logId:log.id,analysis:latest,userId})")&&aiService.includes("if(R.me?.id===userId){await load({force:true}).catch(()=>{});R.events?.emit?.('ai:analysis-error'"));
check('AI apply verifies owned row and account after reload',aiService.includes(".eq('user_id',userId).select('id').maybeSingle()")&&aiService.includes("emit?.('ai:applied',{logId:log.id,analysisId:a.id,textOnly,userId})"));
check('AI candidate selection verifies owned row and account after reload',aiService.includes("throw new Error('Yapay zekâ analizi bulunamadı veya bu hesaba ait değil.')")&&aiService.includes("emit?.('ai:candidate-selected',{analysisId:a.id,index:Number(index),logId:a.log_id,userId})"));
check('AI language detection reuses the safer language service',aiService.includes("R.languageService?.detect?.(original)||R.detect?.(original)"));
check('AI weekday fallback uses timezone-stable UTC calendar math',aiService.includes("+'T12:00:00Z'),w=d.getUTCDay()"));

check('AI UI async actions pin account identity before awaiting service',aiUI.includes('async function analyze(id){const userId=R.me?.id')&&aiUI.includes('async function apply(id,textOnly=false){const userId=R.me?.id')&&aiUI.includes('async function choose(id,index){const userId=R.me?.id'));
check('AI UI does not toast stale completions into another account',aiUI.includes('await A.analyze(id);if(R.me?.id!==userId)return')&&aiUI.includes('await A.applyAnalysis(id,{textOnly});if(R.me?.id!==userId)return'));
check('AI UI clears selected log on account transition',aiUI.includes('selected=null;A.state.selectedLogId=null'));
check('AI UI delegated click tolerates non-Element targets',aiUI.includes("const target=e.target,an=target?.closest?.('[data-ai-analyze]')"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} cross-account integrity checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
