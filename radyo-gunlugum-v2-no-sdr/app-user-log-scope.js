(()=>{
const R=window.R;if(!R||R.__ownedLogScope20260917)return;R.__ownedLogScope20260917=true;
let rawLogs=Array.isArray(R.logs)?R.logs:[];
function isOwnedRow(row,userId=R.me?.id,{legacy=true}={}){if(!userId)return false;const owner=row?.user_id;return owner===null||owner===undefined||owner===''?!!legacy:owner===userId}
function ownedLogs(rows=rawLogs,userId=R.me?.id,options={}){if(!userId)return[];return(Array.isArray(rows)?rows:[]).filter(row=>isOwnedRow(row,userId,options))}
try{Object.defineProperty(R,'logs',{configurable:true,enumerable:true,get(){return ownedLogs(rawLogs)},set(value){rawLogs=Array.isArray(value)?value:[]}})}catch(error){R.reportError?.(error,'owned-log-scope-install',{silent:true});R.logs=ownedLogs(rawLogs)}
R.rawLogs=()=>rawLogs;
R.isOwnedRow=isOwnedRow;
R.ownedLogs=(rows=rawLogs,userId=R.me?.id,options={})=>ownedLogs(rows,userId,options);
R.store?.sync?.('owned-log-scope-install');
R.events?.on?.('auth:changed',()=>R.store?.sync?.('owned-log-scope-auth'));
R.features?.register?.('owned-log-scope',{ready:true,provider:'app-user-log-scope'});
})();
