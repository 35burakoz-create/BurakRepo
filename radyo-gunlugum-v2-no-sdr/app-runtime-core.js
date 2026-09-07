(()=>{
const R=window.R;if(!R||R.__runtimeCore375)return;R.__runtimeCore375=true;
const events=R.events;
const coreRender=R.coreRenderAll,coreLoad=R.coreLoad,coreShow=R.coreShow;
if(typeof coreRender==='function')R.renderAll=(...args)=>{const out=coreRender(...args);events?.emit?.('render:all',{route:R.router?.current?.()||null});return out};
if(typeof coreLoad==='function')R.load=async(...args)=>{events?.emit?.('data:loading');try{const out=await coreLoad(...args);R.store?.sync?.('runtime-load');events?.emit?.('data:loaded',R.store?.counts?.()||{});return out}catch(error){R.reportError?.(error,'runtime-load');events?.emit?.('data:error',error);throw error}};
if(typeof coreShow==='function')R.show=u=>{const out=coreShow(u);events?.emit?.('auth:changed',{user:R.me,authenticated:!!R.me});return out};
R.features?.register?.('runtime-core',{ready:true,provider:'app-runtime-core'});
events?.emit?.('runtime:ready',{provider:'app-runtime-core'});
})();
