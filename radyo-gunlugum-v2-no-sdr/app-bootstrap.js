(()=>{
const R=window.R;if(!R||R.__bootstrap385)return;R.__bootstrap385=true;
const MODULES=[
'app-foundation.js','app-toast.js','app-pwa-install.js','app-runtime-core.js','app-auth-service.js','app-router-core.js','app-ui-state.js','app-auth-ui.js',
'app-current-programs.js','app-guide-service.js','app-language-service.js','app-qsl-service.js','app-record-service.js','app-record-integrity.js','app-offline-service.js','app-smart-analyzer.js',
'app-ai-service.js','app-ai-ui.js','app-achievements-service.js','app-collection-ui.js','app-user-services.js','app-listening-service.js','app-atlas-service.js',
'app-shell-core.js','app-menu-ui.js','app-quick-log.js','app-home-ui.js','app-now-ui.js','app-log-ui.js','app-log-form-ui.js','app-audio-ui.js','app-guide-ui.js','app-analysis-ui.js','app-map-ui.js','app-calendar-ui.js','app-qsl-ui.js',
'app-listening-ui.js','app-atlas-ui.js','app-propagation.js','app-memory.js','app-page-density.js','v44-search-rebuild.js','app-audio-safety.js','app-backup.js','app-pwa-updates.js','app-smoke.js'
];
const loaded=new Set(),loading=new Map();
function preload(){for(const src of MODULES){if(document.querySelector(`link[data-app-preload="${src}"]`))continue;const l=document.createElement('link');l.rel='preload';l.as='script';l.href=src;l.dataset.appPreload=src;document.head.appendChild(l)}}
function load(src){if(loaded.has(src))return Promise.resolve(src);if(loading.has(src))return loading.get(src);const p=new Promise((resolve,reject)=>{const old=[...document.scripts].find(x=>x.src&&x.src.endsWith('/'+src));if(old){loaded.add(src);resolve(src);return}const s=document.createElement('script');s.src=src;s.async=false;s.dataset.appModule='1';s.onload=()=>{loaded.add(src);loading.delete(src);resolve(src)};s.onerror=()=>{loading.delete(src);reject(new Error(`Modül yüklenemedi: ${src}`))};document.body.appendChild(s)});loading.set(src,p);return p}
async function run(){preload();for(const src of MODULES){try{await load(src)}catch(error){console.error(error);R.reportError?.(error,'bootstrap',{silent:true})}}R.events?.emit?.('bootstrap:ready',{modules:[...loaded]});return[...loaded]}
R.bootstrap={modules:MODULES,loaded,loading,load,preload,run};
run();
})();