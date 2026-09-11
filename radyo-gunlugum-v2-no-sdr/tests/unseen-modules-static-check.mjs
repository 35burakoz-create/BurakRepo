import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const offline=read('app-offline-service.js');
const achievements=read('app-achievements-service.js');
const quick=read('app-quick-log.js');
const ai=read('app-ai-service.js');
const runtime=read('app-runtime-core.js');
const backup=read('app-backup.js');
const sw=read('sw.js');
const boot=read('app-bootstrap.js');
const toast=read('app-toast.js');

check('offline queue assigns a stable idempotency key',offline.includes('offline_queue_id')&&offline.includes('queue_id:id'));
check('offline queue sync is conflict-safe',offline.includes("onConflict:'user_id,offline_queue_id'")&&offline.includes('ignoreDuplicates:true'));
check('offline queue never claims ownerless legacy rows for the current account',offline.includes('ownerOf(x)!==userId'));
check('offline queue count is account-scoped',offline.includes('async function list(userId=R.me?.id||null)')&&offline.includes('rows.filter(x=>ownerOf(x)===userId)')&&offline.includes('async function count(userId=R.me?.id||null)')&&offline.includes('if(R.me?.id===userId)R.events?.emit?.'));
check('achievement sync tolerates concurrent tabs',achievements.includes("onConflict:'user_id,achievement_key'")&&achievements.includes('ignoreDuplicates:true'));
check('achievement state is refreshed after conflict-safe sync',achievements.includes('const fresh=await fetchRows(userId)'));
check('achievement async loads are scoped per account',achievements.includes('loadFlights=new Map()')&&achievements.includes('syncFlights=new Map()')&&achievements.includes('if(!applyRows(rows,userId))return state'));
check('quick log blocks duplicate submits',quick.includes('let sig=3,saving=false')&&quick.includes('if(saving)return')&&quick.includes('save.disabled=true'));
check('quick log requires an authenticated user',quick.includes("if(!R.me?.id)return R.toast?.('Hızlı kayıt için giriş yapmalısın.')"));
check('AI history is paged instead of capped at 200',ai.includes('const PAGE_SIZE=1000,MAX_ANALYSES=10000')&&ai.includes('.range(from,from+PAGE_SIZE-1)')&&!ai.includes('.limit(200)'));
check('stale running AI analyses recover as errors',ai.includes('STALE_RUNNING_MS=30*60*1000')&&ai.includes('ai-stale-recovery'));
check('duplicate AI analysis starts are coalesced',ai.includes('activeAnalyses=new Map()')&&ai.includes('if(activeAnalyses.has(key))return activeAnalyses.get(key)'));
check('AI loading is scoped to the authenticated account',ai.includes('loadFlights=new Map()')&&ai.includes('fetchAnalyses(userId)')&&ai.includes('if(R.me?.id!==userId)return state'));
check('AI jobs stop safely if the account changes',ai.includes('Oturum değişti; analiz güvenli biçimde durduruldu.')&&ai.includes('runAnalysis(logId,userId)'));
check('runtime data flights are scoped by account',runtime.includes('loadFlights=new Map()')&&runtime.includes('if(loadFlights.has(userId))return loadFlights.get(userId)'));
check('runtime does not apply stale-account results',runtime.includes('if(R.me?.id!==userId)return data'));
check('full metadata backup includes pending offline records',backup.includes('fetchOfflineOutbox')&&backup.includes('offline_outbox:offlineOutbox'));
check('CSV export preserves offline queue identity',backup.includes("'offline_queue_id'"));
check('PWA install defines a critical shell',sw.includes("const CRITICAL=['./','./index.html','./app-config.js'"));
check('PWA install rejects an incomplete critical shell',sw.includes('criticalFailed.length')&&sw.includes('await caches.delete(CACHE)'));
check('PWA cache does not absorb arbitrary third-party requests',sw.includes('if(!sameOrigin&&!allowedExternal)return'));
check('bootstrap has an explicit critical module contract',boot.includes("const CRITICAL=new Set(['app-foundation.js'")&&boot.includes("R.events?.emit?.('bootstrap:failed'"));
check('bootstrap does not announce ready after critical failure',boot.indexOf("if(criticalFailed.length)")<boot.indexOf("R.events?.emit?.('bootstrap:ready'"));
check('bootstrap attaches load listeners before inserting new scripts',boot.indexOf("s.addEventListener('load'")<boot.indexOf('document.body.appendChild(s)'));
check('error toasts use assertive alert semantics',toast.includes("node.setAttribute('role',isError?'alert':'status')")&&toast.includes("isError?'assertive':'polite'"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} newly-audited-module checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
