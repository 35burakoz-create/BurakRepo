import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),exists=f=>fs.existsSync(path.join(root,f));
const checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const index=read('index.html'),boot=read('app-bootstrap.js'),sw=read('sw.js'),toast=read('app-toast.js'),offline=read('app-offline-service.js'),pwa=read('app-pwa-install.js'),form=read('app-log-form-ui.js'),menu=read('app-menu-ui.js');
for(const f of ['app-toast.js','app-pwa-install.js','app-offline-service.js','app-log-form-ui.js']){let ok=true;try{new vm.Script(read(f),{filename:f})}catch{ok=false}check(`syntax ${f}`,ok)}
check('V22 not directly loaded',!index.includes('v22-mobile.js'));
check('V22 not cached',!sw.includes('v22-mobile.js'));
check('V22 file removed',!exists('v22-mobile.js'));
for(const f of ['app-toast.js','app-pwa-install.js','app-offline-service.js','app-log-form-ui.js'])check(`bootstrap loads ${f}`,boot.includes(`'${f}'`));
for(const f of ['app-toast.css','app-toast.js','app-pwa-install.js','app-offline-service.js','app-log-form.css','app-log-form-ui.js'])check(`SW caches ${f}`,sw.includes(`'./${f}'`));
check('toast provider',toast.includes("provider:'app-toast'")&&toast.includes('R.toast='));
check('PWA install owns service worker registration',pwa.includes("navigator.serviceWorker.register('./sw.js')")&&pwa.includes("addEventListener('beforeinstallprompt'")&&pwa.includes('R.installPWA=install'));
check('menu delegates install',menu.includes("if(a==='install'){close();return R.installPWA?.()}")&&!menu.includes('R.installPrompt.prompt'));
check('offline keeps legacy IndexedDB identity',offline.includes("DB='radio-gunlugum-v22'")&&offline.includes("STORE='outbox'"));
check('offline exposes canonical API',offline.includes('R.queueLog=queueLog')&&offline.includes('R.syncOutbox=syncOutbox')&&offline.includes("provider:'app-offline-service'"));
check('offline edit conflict guard',offline.includes('Offline iken mevcut kayıt düzenlenemez'));
check('offline uses capture submit interception',offline.includes("addEventListener('submit'")&&offline.includes('stopImmediatePropagation'));
check('log form disclosure provider',form.includes("provider:'app-log-form-ui'")&&form.includes('appLogAdvanced'));
check('new services avoid core wrappers',![toast,offline,pwa,form].some(x=>x.includes('R.switch=')||x.includes('R.load=')||x.includes('R.show=')||x.includes('R.renderAll=')));
for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} mobile-service checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));