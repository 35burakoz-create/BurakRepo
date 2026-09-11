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

for(const [file,src] of [['sw.js',sw],['app-menu-ui.js',menu],['app-qsl-service.js',qslService],['app-qsl-ui.js',qslUI],['app-audio-safety.js',audioSafety]]){
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

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} cross-account integrity checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
