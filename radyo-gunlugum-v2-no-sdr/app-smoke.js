(()=>{
const R=window.R;if(!R)return;
function run(){const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail:String(detail||'')});
 add('App config',!!globalThis.RADIO_APP_CONFIG,globalThis.RADIO_APP_CONFIG?.version||'');
 add('Router',!!R.router&&R.router.has?.('home')&&R.router.has?.('now'),'home/now routes');
 add('Store',!!R.store&&typeof R.store.search==='function',JSON.stringify(R.store?.counts?.()||{}));
 add('Global arama',typeof R.openGlobalSearch==='function'&&typeof R.v44SearchEngine==='function','V44 engine');
 let toolSearch=false;try{const x=R.v44SearchEngine?.('Yayılım');toolSearch=!!x?.groups?.some(g=>g.items?.some(i=>String(i.title).includes('Yayılım')))}catch{}add('Arama motoru sorgusu',toolSearch,'Yayılım araması');
 add('Radio Memory',typeof R.openRadioMemory==='function','memory API');
 add('Propagation',!!document.querySelector('#tab-propagation')||typeof R.renderPropagation==='function','propagation view/API');
 add('Ana görünüm',!!document.querySelector('#tab-home'),'#tab-home');
 add('Şu An görünümü',!!document.querySelector('#tab-now'),'#tab-now');
 add('Tek bootstrap',!!document.querySelector('script[src="app-bootstrap.js"],script[src="./app-bootstrap.js"]'),'app-bootstrap.js');
 add('Eski insights loader yok',!document.querySelector('script[src="insights.js"],script[src="./insights.js"]'),'legacy insights disabled');
 add('V43 hotfix yok',!document.querySelector('script[src="v43-search-hotfix.js"],script[src="./v43-search-hotfix.js"]'),'obsolete search shim removed');
 const failed=checks.filter(x=>!x.ok),result={at:new Date().toISOString(),ok:failed.length===0,checks,failed:failed.map(x=>x.name)};
 R.lastSmoke=result;R.events?.emit?.('smoke:complete',result);if(failed.length)R.reportError?.(new Error(`Smoke check failed: ${failed.map(x=>x.name).join(', ')}`),'smoke',{silent:true});return result}
R.smoke={run,last:()=>R.lastSmoke||null};R.features?.register?.('smoke',{ready:true});setTimeout(run,700);setTimeout(()=>{if(!R.lastSmoke?.ok)run()},2200);
})();