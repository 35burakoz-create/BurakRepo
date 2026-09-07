(()=>{
const R=window.R;if(!R)return;
let started=false,tries=0;
function loadOnce(src,mark){if(mark&&document.querySelector(`[${mark}]`))return Promise.resolve();if(document.querySelector(`script[src="${src}"],script[src="./${src}"]`))return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;if(mark)s.setAttribute(mark,'1');s.onload=resolve;s.onerror=()=>reject(new Error(src+' yüklenemedi'));document.head.appendChild(s)})}
async function start(){if(started)return;tries++;const ready=typeof R.openGlobalSearch==='function'&&typeof R.openRadioMemory==='function'&&(document.querySelector('#tab-propagation')||typeof R.renderPropagation==='function');if(!ready&&tries<160)return setTimeout(start,50);started=true;try{await loadOnce('app-config.js','data-app-config-loader');await loadOnce('app-foundation.js','data-app-foundation-loader')}catch(error){console.error('V3.7 Foundation yüklenemedi',error)}}
setTimeout(start,0);
})();
