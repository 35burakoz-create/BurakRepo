(()=>{
const R=window.R;if(!R||R.__diagnosticsIsolation391)return;R.__diagnosticsIsolation391=true;
const OWNER_KEY='radio-diagnostics-owner-v1';
const ownerKey=userId=>String(userId||'anonymous');
function closeOpenDiagnostics(){document.querySelector('#foundationDiagOverlay')?.remove();document.querySelector('#foundationDiag')?.remove()}
function readOwner(){try{return localStorage.getItem(OWNER_KEY)}catch{return null}}
function writeOwner(value){try{localStorage.setItem(OWNER_KEY,value)}catch{}}
function isolate(payload={}){const next=ownerKey(payload?.user?.id||null),previous=readOwner(),transitioned=previous!==null?previous!==next:!!payload?.previousUserId;if(transitioned){R.diagnostics?.clear?.();closeOpenDiagnostics();R.events?.emit?.('diagnostics:isolated',{previous,next})}writeOwner(next);return transitioned}
R.events?.on?.('auth:changed',isolate);
R.diagnosticsIsolation={isolate,readOwner,ownerKey,closeOpenDiagnostics};
R.features?.register?.('diagnostics-isolation',{ready:true,provider:'app-diagnostics-isolation'});
})();