import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const menu=read('app-menu-ui.js'),shell=read('app-shell-core.js'),sw=read('sw.js'),css=read('app-visual-polish.css'),config=read('app-config.js');
for(const [f,src] of [['app-menu-ui.js',menu],['app-shell-core.js',shell]]){let ok=true;try{new vm.Script(src,{filename:f})}catch{ok=false}check(`syntax ${f}`,ok)}
check('collection is collapsed by default',!menu.includes('<details class="v38-menu-group" open>'));
check('all menu groups start collapsed',(menu.match(/<details class="v38-menu-group">/g)||[]).length>=4);
check('menu groups behave as accordion',menu.includes("group.addEventListener('toggle'")&&menu.includes('other.open=false'));
check('menu exposes quick search',menu.includes('Uygulamada ara')&&menu.includes("if(a==='search')"));
check('menu dialog semantics',menu.includes("setAttribute('role','dialog')")&&menu.includes("setAttribute('aria-modal','true')"));
check('escape closes menu',menu.includes("e.key==='Escape'"));
check('visual polish is loaded after design system',shell.indexOf("v42-design-system.css")<shell.indexOf("app-visual-polish.css"));
check('visual polish is cached',sw.includes("'./app-visual-polish.css'"));
check('mobile form controls avoid zoom',css.includes('input,select,textarea{font-size:16px!important}'));
check('mobile menu uses full-width bottom sheet',css.includes('width:100%!important')&&css.includes('max-height:86dvh!important'));
check('menu touch targets are enlarged',css.includes('.v38-menu-row{min-height:58px')&&css.includes('.v38-menu-group summary{min-height:50px'));
check('dense microcopy readability overrides exist',css.includes('.app-listen-mini-main small')&&css.includes('.v41-forecast span')&&css.includes('.app-atlas-pill'));
check('fresh PWA identity for visual changes',config.includes('menu-visual-polish-20260910-5'));
for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} menu/visual checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));
