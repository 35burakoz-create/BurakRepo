import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),exists=f=>fs.existsSync(path.join(root,f));
const checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const index=read('index.html'),boot=read('app-bootstrap.js'),sw=read('sw.js'),service=read('app-guide-service.js'),ui=read('app-guide-ui.js'),current=read('app-current-programs.js'),listening=read('app-listening-service.js');
for(const f of ['app-guide-service.js','app-guide-ui.js']){let ok=true;try{new vm.Script(read(f),{filename:f})}catch{ok=false}check(`syntax ${f}`,ok)}
check('V21 direct loader removed',!index.includes('v21-guide.js'));
check('V21 cache removed',!sw.includes('v21-guide.js'));
check('V21 file removed',!exists('v21-guide.js'));
check('guide service booted',boot.includes("'app-guide-service.js'"));check('guide UI booted',boot.includes("'app-guide-ui.js'"));
check('guide service cached',sw.includes("'./app-guide-service.js'"));check('guide UI cached',sw.includes("'./app-guide-ui.js'")&&sw.includes("'./app-guide.css'"));
check('current programs still owns guide table loading',current.includes('guide_entries')&&current.includes('guide_time_rules')&&current.includes('guide_band_profiles'));
check('guide service UI-free',service.includes("provider:'app-guide-service'")&&service.includes('function scoreEntry')&&service.includes('function identify')&&service.includes('function entries')&&!service.includes('document.querySelector')&&!service.includes('innerHTML')&&!service.includes('R.switch=')&&!service.includes('R.load='));
check('guide UI owns prefill and rendering',ui.includes('R.prefillGuide=prefill')&&ui.includes('R.renderGuide=render')&&ui.includes("R.router?.register?.('guide'")&&ui.includes("provider:'app-guide-ui'"));
check('guide UI has identification flow',ui.includes('Bu yayın ne olabilir?')&&ui.includes('R.guideService?.identify?.')&&ui.includes('data-guide-prefill'));
check('guide UI no core wrappers',!ui.includes('R.switch=')&&!ui.includes('R.load=')&&!ui.includes('R.show=')&&!ui.includes('R.renderAll=')&&!ui.includes('MutationObserver'));
check('listening mystery can use guide score',listening.includes('R.scoreEntry?.(e)?.score'));
check('guide service defines compatibility score API',service.includes('R.scoreEntry=e=>scoreEntry(e)'));
check('service loads before listening',boot.indexOf("'app-guide-service.js'")<boot.indexOf("'app-listening-service.js'"));
for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} guide-modernization checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));