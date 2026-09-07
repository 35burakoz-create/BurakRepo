(()=>{
const R=window.R;if(!R)return;
function run(){const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail:String(detail||'')});
 add('App config',globalThis.RADIO_APP_CONFIG?.version==='3.7.6',globalThis.RADIO_APP_CONFIG?.version||'');
 add('Pristine core bridge',typeof R.coreSwitch==='function'&&typeof R.coreBody==='function'&&R.__coreBridge===true,'core primitives captured');
 add('Runtime Core',R.features?.get?.('runtime-core')?.provider==='app-runtime-core',R.features?.get?.('runtime-core')?.provider||'');
 add('Router',!!R.router&&R.router.has?.('home')&&R.router.has?.('now')&&R.router.has?.('memory')&&R.router.has?.('propagation'),'home/now/memory/propagation routes');
 add('Router Foundation provider',R.features?.get?.('router')?.provider==='app-router-core',R.features?.get?.('router')?.provider||'');
 add('Current programs',R.features?.get?.('current-programs')?.provider==='app-current-programs'&&typeof R.radioNowCandidates==='function','exact active-window engine');
 add('Record integrity',R.features?.get?.('record-integrity')?.provider==='app-record-integrity'&&typeof R.validateFrequency==='function','frequency/body/delete integrity');
 add('Smart analyzer',R.features?.get?.('smart-analyzer')?.provider==='app-smart-analyzer','guide-based analyzer');
 add('User services',R.features?.get?.('user-services')?.provider==='app-user-services','settings/reminders/favorites');
 add('Shell provider',R.features?.get?.('shell')?.provider==='app-shell',R.features?.get?.('shell')?.provider||'');
 add('UI state Foundation provider',R.features?.get?.('ui-state')?.provider==='app-ui-state',R.features?.get?.('ui-state')?.provider||'');
 add('Store',!!R.store&&typeof R.store.search==='function',JSON.stringify(R.store?.counts?.()||{}));
 add('Global arama',typeof R.openGlobalSearch==='function'&&typeof R.v44SearchEngine==='function','V44 engine');
 let toolSearch=false;try{const x=R.v44SearchEngine?.('Yayılım');toolSearch=!!x?.groups?.some(g=>g.items?.some(i=>String(i.title).includes('Yayılım')))}catch{}add('Arama motoru sorgusu',toolSearch,'Yayılım araması');
 add('Radio Memory',typeof R.openRadioMemory==='function'&&!!R.memory,'app-memory API');
 add('Memory Foundation provider',R.features?.get?.('memory')?.provider==='app-memory',R.features?.get?.('memory')?.provider||'');
 add('Propagation provider',R.features?.get?.('propagation')?.provider==='app-propagation',R.features?.get?.('propagation')?.provider||'');
 add('Audio safety',R.features?.get?.('audio-safety')?.provider==='app-audio-safety'&&typeof R.openAudioRecovery==='function','orphan audio recovery');
 add('Backup',R.features?.get?.('backup')?.provider==='app-backup','CSV/JSON backup');
 for(const f of ['v33-stability-hotfix.js','v34-current-programs.js','v35-audit-fixes.js','v35-runtime-bridge.js','v36-integrity-audit.js','v37-integrity-followup.js','v38-ux-shell.js','v39-navigation-state.js','v40-radio-memory.js','v41-propagation-assistant.js','v42-ui-polish.js'])add(`Legacy yok: ${f}`,!document.querySelector(`script[src="${f}"],script[src="./${f}"]`),'retired');
 add('Ana görünüm',!!document.querySelector('#tab-home'),'#tab-home');add('Şu An görünümü',!!document.querySelector('#tab-now'),'#tab-now');add('Propagation görünümü',!!document.querySelector('#tab-propagation'),'#tab-propagation');
 add('Tek bootstrap',!!document.querySelector('script[src="app-bootstrap.js"],script[src="./app-bootstrap.js"]'),'app-bootstrap.js');add('Core bridge sırası',!!document.querySelector('script[src="app-core-bridge.js"],script[src="./app-core-bridge.js"]'),'app-core-bridge.js');add('Eski insights loader yok',!document.querySelector('script[src="insights.js"],script[src="./insights.js"]'),'legacy insights disabled');add('V43 hotfix yok',!document.querySelector('script[src="v43-search-hotfix.js"],script[src="./v43-search-hotfix.js"]'),'obsolete search shim removed');
 const failed=checks.filter(x=>!x.ok),result={at:new Date().toISOString(),ok:failed.length===0,checks,failed:failed.map(x=>x.name)};R.lastSmoke=result;R.events?.emit?.('smoke:complete',result);if(failed.length)R.reportError?.(new Error(`Smoke check failed: ${failed.map(x=>x.name).join(', ')}`),'smoke',{silent:true});return result}
R.smoke={run,last:()=>R.lastSmoke||null};R.features?.register?.('smoke',{ready:true});setTimeout(run,700);setTimeout(()=>{if(!R.lastSmoke?.ok)run()},2200);
})();
