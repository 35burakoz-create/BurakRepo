(()=>{
const R=window.R;if(!R||R.__bootstrap37)return;R.__bootstrap37=true;
const MODULES=[
 'v24-achievements.js','v25-smart-listening.js','v26-radio-atlas.js','v30-ai-radio-assistant.js',
 'v33-stability-hotfix.js','v34-current-programs.js','v35-audit-fixes.js','v35-runtime-bridge.js','v36-integrity-audit.js','v37-integrity-followup.js',
 'v38-listening-mode.js','v38-ux-shell.js','v41-propagation-assistant.js','v42-ui-polish.js','v44-search-rebuild.js',
 'app-foundation.js','app-router-core.js','app-memory.js','app-ui-state.js','app-smoke.js'
];
function load(src){if(document.querySelector(`script[src="${src}"],script[src="./${src}"]`))return Promise.resolve({src,cached:true});return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.dataset.appModule='1';s.onload=()=>resolve({src,cached:false});s.onerror=()=>reject(new Error(`${src} yüklenemedi`));document.head.appendChild(s)})}
async function boot(){const failed=[];for(const src of MODULES){try{await load(src)}catch(error){console.error(error);failed.push({src,error})}}try{R.ensureCompatHome?.();if(!R.__booted){R.__booted=true;await R.boot()}}catch(error){console.error('Uygulama boot hatası',error);R.reportError?.(error,'bootstrap');const msg=document.querySelector('#authMsg');if(msg)msg.textContent='Uygulama başlatılamadı: '+(error?.message||error);return}R.store?.sync?.('bootstrap-complete');R.router?.sync?.();setTimeout(()=>R.smoke?.run?.(),150);R.events?.emit?.('bootstrap:ready',{failed:failed.map(x=>x.src),modules:MODULES.length});if(failed.length){const names=failed.map(x=>x.src).join(', ');console.warn('Bazı modüller yüklenemedi:',names);R.reportError?.(new Error(`Modül yükleme hataları: ${names}`),'bootstrap',{silent:true});if(R.me&&R.toast)R.toast('Bazı gelişmiş araçlar yüklenemedi; Sistem Durumu bölümünden kontrol edebilirsin.')}}
boot().catch(error=>{console.error('Bootstrap beklenmeyen hata',error);R.reportError?.(error,'bootstrap-unhandled');});
})();
