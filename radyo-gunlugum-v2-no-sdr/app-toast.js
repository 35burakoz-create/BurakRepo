(()=>{
const R=window.R;if(!R||R.__toast382)return;R.__toast382=true;
function css(){if(document.querySelector('link[data-app-toast-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='app-toast.css';l.dataset.appToastCss='1';document.head.appendChild(l)}css();
let timer=null,node=null;
function close(){if(timer)clearTimeout(timer);timer=null;node?.remove();node=null}
function toast(message,{type='info',duration=2600}={}){close();node=document.createElement('div');node.className=`app-toast ${type==='error'?'error':type==='success'?'success':''}`.trim();node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.textContent=String(message??'');document.body.appendChild(node);timer=setTimeout(close,Math.max(900,Number(duration)||2600));return node}
R.toast=(message,opts)=>toast(message,opts);R.toastService={show:toast,close};R.features?.register?.('toast',{ready:true,provider:'app-toast'});
})();