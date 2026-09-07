import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),exists=f=>fs.existsSync(path.join(root,f));
const checks=[];function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}
const core=read('core.js'),index=read('index.html'),boot=read('app-bootstrap.js'),sw=read('sw.js'),runtime=read('app-runtime-core.js'),authService=read('app-auth-service.js'),authUI=read('app-auth-ui.js'),router=read('app-router-core.js'),records=read('app-record-service.js'),integrity=read('app-record-integrity.js'),form=read('app-log-form-ui.js'),log=read('app-log-ui.js'),uiState=read('app-ui-state.js'),quick=read('app-quick-log.js'),config=read('app-config.js');
for(const f of ['core.js','app-runtime-core.js','app-auth-service.js','app-auth-ui.js','app-router-core.js','app-record-service.js','app-record-integrity.js','app-log-form-ui.js','app-log-ui.js','app-ui-state.js','app-quick-log.js']){let ok=true;try{new vm.Script(read(f),{filename:f})}catch{ok=false}check(`syntax ${f}`,ok)}
check('core base marker',core.includes('R.__coreBase=true'));
check('core builds Supabase client',core.includes('supabase.createClient'));
for(const token of ['R.load=','R.switch=','R.renderAll=','R.show=','R.body=','R.reset=','R.edit=','R.del=','R.play=','R.boot=',".auth.signInWithPassword",".auth.onAuthStateChange",".from('radio_logs')",".storage.from('radio-audio')",'addEventListener(','.onclick=','innerHTML'])check(`core excludes ${token}`,!core.includes(token));
const localScripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('http'));
check('index direct chain config core bootstrap',JSON.stringify(localScripts)===JSON.stringify(['app-config.js','core.js','app-bootstrap.js']));
check('core bridge not loaded',!index.includes('app-core-bridge.js'));
check('core bridge not cached',!sw.includes('app-core-bridge.js'));
check('core bridge file removed',!exists('app-core-bridge.js'));
for(const f of ['app-auth-service.js','app-auth-ui.js','app-record-service.js']){check(`bootstrap loads ${f}`,boot.includes(`'${f}'`));check(`SW caches ${f}`,sw.includes(`'./${f}'`))}
check('runtime canonical',runtime.includes('R.load=load')&&runtime.includes('R.renderAll=renderAll')&&!runtime.includes('R.coreLoad')&&!runtime.includes('R.coreShow')&&!runtime.includes('R.coreRenderAll'));
check('auth service canonical',authService.includes('R.boot=boot')&&authService.includes('onAuthStateChange')&&authService.includes("provider:'app-auth-service'")&&!authService.includes('document.querySelector'));
check('auth UI delegates auth',authUI.includes('R.show=show')&&authUI.includes('R.auth?.signIn?.')&&authUI.includes('R.auth?.signUp?.')&&authUI.includes('R.auth?.signOut?.'));
check('router canonical',router.includes('function switchView')&&!router.includes('R.coreSwitch')&&router.includes("provider:'app-router-core'"));
check('record service canonical CRUD',records.includes('R.records={save,remove,signedAudioUrl}')&&records.includes("provider:'app-record-service'")&&!records.includes('document.querySelector'));
check('record integrity no CRUD wrappers',integrity.includes('R.validateFrequency=validateFrequency')&&!integrity.includes('R.body=')&&!integrity.includes('R.reset=')&&!integrity.includes('R.edit=')&&!integrity.includes('R.del='));
check('log form owns form lifecycle',form.includes('R.body=body')&&form.includes('R.reset=reset')&&form.includes('R.edit=edit')&&form.includes('R.records?.save?.')&&form.includes("R.events?.emit?.('form:reset'"));
check('log UI delegates delete/audio',log.includes('R.records?.remove?.')&&log.includes('R.records?.signedAudioUrl?.')&&log.includes('R.renderRecords=renderRecords'));
check('ui state no reset wrapper',uiState.includes("R.events?.on?.('form:reset',clearDraft)")&&!uiState.includes('priorReset')&&!uiState.includes('R.reset=()=>'));
check('quick log uses record service',quick.includes('R.records?.save?.')&&!quick.includes("from('radio_logs').insert"));
const forbidden=['R.coreSwitch','R.coreShow','R.coreLoad','R.coreRenderAll','R.coreBody','R.coreReset','R.coreEdit','R.coreDel'];for(const token of forbidden)check(`bootstrap modules avoid ${token}`,!([...boot.matchAll(/'([^']+\.js)'/g)].map(x=>x[1]).filter(f=>exists(f)).some(f=>read(f).includes(token))));
check('service order runtime auth router',boot.indexOf("'app-runtime-core.js'")<boot.indexOf("'app-auth-service.js'")&&boot.indexOf("'app-auth-service.js'")<boot.indexOf("'app-router-core.js'"));
check('service order record integrity offline form',boot.indexOf("'app-record-service.js'")<boot.indexOf("'app-record-integrity.js'")&&boot.indexOf("'app-record-integrity.js'")<boot.indexOf("'app-offline-service.js'")&&boot.indexOf("'app-offline-service.js'")<boot.indexOf("'app-log-form-ui.js'"));
check('config version V3.8.5',config.includes("version:'3.8.5'")&&config.includes('v385-core-boundary'));
for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);const failed=checks.filter(x=>!x[1]);console.log(`\n${checks.length-failed.length}/${checks.length} core-boundary checks passed.`);if(failed.length)console.error('Failed:',failed.map(x=>x[0]).join(', '));