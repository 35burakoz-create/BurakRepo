import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),exists=f=>fs.existsSync(path.join(root,f));
const checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const index=read('index.html'),boot=read('app-bootstrap.js'),sw=read('sw.js'),language=read('app-language-service.js'),audio=read('app-audio-ui.js'),safety=read('app-audio-safety.js'),analysis=read('app-analysis-ui.js'),map=read('app-map-ui.js'),calendar=read('app-calendar-ui.js'),qslService=read('app-qsl-service.js'),qslUI=read('app-qsl-ui.js');
for(const f of ['app-language-service.js','app-audio-ui.js','app-analysis-ui.js','app-map-ui.js','app-calendar-ui.js','app-qsl-service.js','app-qsl-ui.js']){let ok=true;try{new vm.Script(read(f),{filename:f})}catch{ok=false}check(`syntax ${f}`,ok)}
const localScripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('http'));
check('direct local script chain minimal',JSON.stringify(localScripts)===JSON.stringify(['app-config.js','core.js','app-core-bridge.js','app-bootstrap.js']));
check('audio-smart direct loader removed',!index.includes('audio-smart.js'));check('app-insights direct loader removed',!index.includes('app-insights.js'));
check('audio-smart cache removed',!sw.includes('audio-smart.js'));check('app-insights cache removed',!sw.includes('app-insights.js'));
check('audio-smart file removed',!exists('audio-smart.js'));check('app-insights file removed',!exists('app-insights.js'));
for(const f of ['app-language-service.js','app-qsl-service.js','app-audio-ui.js','app-analysis-ui.js','app-map-ui.js','app-calendar-ui.js','app-qsl-ui.js']){check(`bootstrap loads ${f}`,boot.includes(`'${f}'`));check(`SW caches ${f}`,sw.includes(`'./${f}'`))}
check('language service keeps R.detect compatibility',language.includes('R.detect=detect')&&language.includes("provider:'app-language-service'"));
check('audio UI owns capture upload speech',audio.includes('getUserMedia')&&audio.includes("storage.from('radio-audio').upload")&&audio.includes('SpeechRecognition')&&audio.includes("provider:'app-audio-ui'"));
check('audio upload emits explicit event',audio.includes("R.events?.emit?.('audio:uploaded'"));
check('audio safety listens to upload event',safety.includes("R.events?.on?.('audio:uploaded'")&&!safety.includes('MutationObserver'));
check('analysis ownership',analysis.includes('R.renderAnalysis=render')&&analysis.includes("provider:'app-analysis-ui'"));
check('map ownership',map.includes('R.renderMap=render')&&map.includes("provider:'app-map-ui'"));
check('calendar ownership',calendar.includes('R.renderCalendar=render')&&calendar.includes("provider:'app-calendar-ui'"));
check('QSL service UI-free',qslService.includes('function report')&&qslService.includes('async function setStatus')&&qslService.includes("provider:'app-qsl-service'")&&!qslService.includes('document.querySelector')&&!qslService.includes('innerHTML'));
check('QSL UI delegates status writes',qslUI.includes('R.qslService?.setStatus?.')&&!qslUI.includes("from('radio_logs').update")&&qslUI.includes("provider:'app-qsl-ui'"));
check('new modules avoid core wrappers',![language,audio,analysis,map,calendar,qslService,qslUI].some(x=>x.includes('R.switch=')||x.includes('R.load=')||x.includes('R.show=')||x.includes('R.renderAll=')));
for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} direct-legacy checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));