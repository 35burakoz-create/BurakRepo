import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const guide=read('app-guide-service.js');
const propagation=read('app-propagation.js');
const log=read('app-log-ui.js');
const map=read('app-map-ui.js');
const audio=read('app-audio-ui.js');
const auth=read('app-auth-ui.js');
const listening=read('app-listening-ui.js');
const foundation=read('app-foundation.js');
const collection=read('app-collection-ui.js');
const achievements=read('app-achievements-service.js');
const shell=read('app-shell-core.js');
const deepCss=read('app-deep-audit.css');
const sw=read('sw.js');
const manifest=read('manifest.webmanifest');
const index=read('index.html');

check('guide history scoring uses an indexed frequency window',guide.includes('rebuildHistoryIndex')&&guide.includes('lowerBound(rows,f-tol)')&&guide.includes('historyByBand'));
check('guide wall-clock formatter is reused',guide.includes('const wallFmt=new Intl.DateTimeFormat')&&guide.includes('wallFmt.formatToParts'));
check('propagation personal history is bucketed',propagation.includes('rebuildPersonalIndex')&&propagation.includes('personalLogBuckets')&&propagation.includes('personalAttemptBuckets'));
check('propagation rankings reuse one solar context',propagation.includes('const near=')&&propagation.includes('solar=solarFor(d),currentPhase=phase(solar)')&&propagation.includes('{solar,phase:currentPhase}'));
check('propagation reacts to fresh listening attempts',propagation.includes("R.events?.on?.('listening:data'"));
check('journal renders records progressively',log.includes('const VISIBLE_STEP=100')&&log.includes('rows.slice(0,visibleCount)')&&log.includes('data-log-more'));
check('listening map uses selected listening origin',map.includes('R.listeningOrigin?.()')&&map.includes("R.events?.on?.('user:settings'"));
check('audio devices stop when leaving audio route',audio.includes("R.events?.on?.('route:before'")&&audio.includes("x?.from==='audio'")&&audio.includes('cleanup()'));
check('audio preview URL is released on form reset',audio.includes("R.events?.on?.('form:reset',releasePreview)"));
check('hidden smart view is not redrawn on every data load',listening.includes("if(route==='smart')renderSmart()")&&!listening.includes("R.events?.on?.('data:loaded',()=>{renderSmart();"));
check('listening helper modal has dialog semantics',listening.includes("m.setAttribute('role','dialog')")&&listening.includes("m.setAttribute('aria-modal','true')")&&listening.includes("e.key==='Escape'&&$('#appListenModal')"));
check('collection modal has dialog semantics',collection.includes("m.setAttribute('role','dialog')")&&collection.includes("m.setAttribute('aria-modal','true')"));
check('diagnostics dialog has keyboard semantics',foundation.includes("m.setAttribute('role','dialog')")&&foundation.includes("e.key==='Escape'&&$('#foundationDiag')"));
check('shared clock formatters are cached',foundation.includes('const clockFormatter=')&&foundation.includes('formatters=new Map()')&&foundation.includes('formatters.set(key,f)'));
check('signup mode tells password managers this is a new password',auth.includes("mode==='signup'?'new-password':'current-password'"));
check('common authentication errors are localized',auth.includes('function authMessage')&&auth.includes('E-posta adresi veya şifre hatalı.'));
check('important form messages are live regions',index.includes('id="authMsg" class="msg" role="status" aria-live="polite"')&&index.includes('id="formMsg" class="msg" role="status" aria-live="polite"'));
check('deep visual layer removes stacked bottom padding',deepCss.includes('body{padding-bottom:0!important}')&&deepCss.includes('#appView{padding-bottom:calc(104px + env(safe-area-inset-bottom))!important}'));
check('deep visual layer is loaded by shell',shell.includes("css('app-deep-audit.css','appDeepAuditCss')"));
check('deep visual layer is cached by PWA',sw.includes("'./app-deep-audit.css'"));
check('manifest description is natural Turkish',manifest.includes('Radyo Hafızası')&&manifest.includes('Yayılım Asistanı')&&manifest.includes('yapay zekâ araçlarını')&&!/Radio Memory|Propagation Assistant|global arama|AI araç/.test(manifest));
check('achievement wording uses Turkish UI terminology',achievements.includes('konuşma dökümünü')&&achievements.includes('QSL yanıtını')&&!achievements.includes('transkriptini'));
check('achievement fallback load reuses cache',achievements.includes("setTimeout(()=>{if(R.me)load().catch"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(x=>!x[1]);
console.log(`\n${checks.length-failed.length}/${checks.length} deep-audit checks passed.`);
if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));
