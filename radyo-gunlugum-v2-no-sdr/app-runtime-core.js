(()=>{
const R=window.R;if(!R||R.__runtimeCore385)return;R.__runtimeCore385=true;const events=R.events;let loadFlight=null;
const PAGE_SIZE=1000,MAX_ROWS=50000;
function renderAll(reason='runtime'){const payload={route:R.router?.current?.()||null,reason};events?.emit?.('render:all',payload);return payload}
async function fetchPaged(build,label){const out=[];for(let from=0;from<MAX_ROWS;from+=PAGE_SIZE){const q=await build().range(from,from+PAGE_SIZE-1);if(q.error)throw q.error;const rows=q.data||[];out.push(...rows);if(rows.length<PAGE_SIZE)return out}throw new Error(`${label} ${MAX_ROWS.toLocaleString('tr-TR')} satırlık güvenlik sınırını aştı.`)}
function fetchLogs(){return fetchPaged(()=>R.S.from('radio_logs').select('*').eq('user_id',R.me.id).order('date',{ascending:false}).order('time',{ascending:false}).order('id',{ascending:false}),'Günlük kayıtları')}
function fetchSchedules(){return fetchPaged(()=>R.S.from('station_schedules').select('*').order('band').order('frequency').order('id'),'Yayın çizelgesi')}
async function fetchData(){if(!R.me?.id)return{logs:[],schedules:[]};const[logs,schedules]=await Promise.all([fetchLogs(),fetchSchedules()]);return{logs,schedules}}
function load(){if(loadFlight)return loadFlight;if(!R.me?.id)return Promise.resolve({logs:R.logs||[],schedules:R.schedules||[]});loadFlight=(async()=>{events?.emit?.('data:loading');try{const data=await fetchData();R.logs=data.logs;R.schedules=data.schedules;R.store?.sync?.('runtime-load');renderAll('data-loaded');events?.emit?.('data:loaded',{...(R.store?.counts?.()||{}),logs:R.logs.length,schedules:R.schedules.length});return data}catch(error){R.reportError?.(error,'runtime-load');events?.emit?.('data:error',error);throw error}finally{loadFlight=null}})();return loadFlight}
R.load=load;R.renderAll=renderAll;R.runtime={load,renderAll,fetchData,fetchLogs,fetchSchedules,loadInFlight:()=>!!loadFlight,pageSize:PAGE_SIZE,maxRows:MAX_ROWS};R.features?.register?.('runtime-core',{ready:true,provider:'app-runtime-core'});events?.emit?.('runtime:ready',{provider:'app-runtime-core'});
})();
