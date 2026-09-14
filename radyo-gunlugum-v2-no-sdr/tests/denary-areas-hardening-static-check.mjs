import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

const offline=read('app-offline-service.js');
const records=read('app-record-service.js');
const calendar=read('app-calendar-ui.js');
const analysis=read('app-analysis-ui.js');
const menu=read('app-menu-ui.js');

for(const [file,src] of [
  ['app-offline-service.js',offline],['app-record-service.js',records],
  ['app-calendar-ui.js',calendar],['app-analysis-ui.js',analysis],['app-menu-ui.js',menu]
]){
  let ok=true;try{new vm.Script(src,{filename:file})}catch{ok=false}
  check(`syntax ${file}`,ok);
}

check('offline queue reads no longer turn IndexedDB failures into an empty list',offline.includes('const rows=await all();return rows.filter')&&!offline.includes('const rows=await all().catch(()=>[])'));
check('offline synchronization surfaces initial IndexedDB read failures',offline.includes('const rows=await all();let synced=0'));
check('offline queue write keeps a successful enqueue even if only the count read fails',offline.includes("catch(error){R.reportError?.(error,'offline-queue-count'")&&offline.includes("n==null?'Kayıt çevrimdışı kuyruğa alındı.'"));
check('offline synchronization remains idempotent by account and queue id',offline.includes("onConflict:'user_id,offline_queue_id'")&&offline.includes('ignoreDuplicates:true'));
check('offline refresh failure is distinguished from synchronization failure',offline.includes("'offline-sync-refresh'")&&offline.includes('günlük görünümü yenilenemedi'));

check('record edits load the canonical pre-update audio path from the database',records.includes('async function currentRecord')&&records.includes('before=await currentRecord(id,userId)'));
check('record edits remove canonical prior audio rather than trusting caller oldAudioPath',records.includes('const priorAudio=before?.audio_path||null')&&records.includes("removeAudio(priorAudio,userId,'record-save-old-audio')"));
check('record delete never falls back to a stale in-memory audio path',records.includes('if(q.data.audio_path)await removeAudio(q.data.audio_path')&&!records.includes('q.data.audio_path||log.audio_path'));
check('storage deletion rejects paths outside the authenticated account folder',records.includes('function ownedAudioPath')&&records.includes('if(!ownedAudioPath(path,userId))'));

check('calendar builds an account-scoped date index',calendar.includes('function dateIndex()')&&calendar.includes('x?.user_id!==userId')&&calendar.includes('dateCounts=next'));
check('calendar date index is invalidated on data and account changes',calendar.includes("R.events?.on?.('data:loaded',()=>{invalidate()")&&calendar.includes("R.events?.on?.('auth:changed',()=>invalidate())"));
check('calendar still rejects impossible Gregorian dates',calendar.includes('x.getUTCFullYear()===y')&&calendar.includes('x.getUTCMonth()===mo-1'));

check('analysis is restricted to the active account and receiver bands',analysis.includes('function ownedLogs()')&&analysis.includes('x?.user_id===userId')&&analysis.includes('allowed.has(String(x?.band||'));
check('analysis uses strict clock validation including minutes and seconds',analysis.includes('function validClockTime')&&analysis.includes('min>=0&&min<=59')&&analysis.includes('sec>=0&&sec<=59'));
check('analysis predictions use strict validated hours',analysis.includes('const hour=validClockTime(x.time)'));

check('reminder menu update verifies an actual returned row',menu.includes(".select('id,enabled').maybeSingle()")&&menu.includes("if(!q.data)throw new Error('Hatırlatıcı bulunamadı veya bu hesaba ait değil.')"));
check('reminder menu only mutates the active account cache row',menu.includes('x?.user_id===userId&&String(x.id)===String(reminderId)'));

// Functional analysis checks: foreign accounts, unsupported bands and malformed times.
{
  const R={
    features:{register(){}},router:{register(){}},events:{on(){}},B:['MW','SW1'],me:{id:'u1'},
    logs:[
      {user_id:'u1',band:'MW',signal_strength:5,time:'03:99',station:'A'},
      {user_id:'u1',band:'SW1',signal_strength:3,time:'04:30',station:'B'},
      {user_id:'u1',band:'SW99',signal_strength:1,time:'02:10',station:'bad-band'},
      {user_id:'u2',band:'MW',signal_strength:1,time:'01:10',station:'foreign'}
    ]
  };
  const sandbox={window:{R},document:{querySelector(){return null}},Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  vm.createContext(sandbox);vm.runInContext(analysis,sandbox,{filename:'app-analysis-ui.js'});
  const owned=R.analysisUI.ownedLogs();
  check('analysis functionally excludes foreign-account and unsupported-band rows',owned.length===2&&owned.every(x=>x.user_id==='u1')&&owned.every(x=>['MW','SW1'].includes(x.band)));
  check('analysis rejects 03:99 as an invalid clock time',R.analysisUI.validClockTime('03:99')===null);
  check('analysis accepts a real minute value',R.analysisUI.validClockTime('04:30')===4);
  check('analysis rejects invalid seconds',R.analysisUI.validClockTime('04:30:99')===null);
}

// Functional calendar checks: one pass index, account isolation and impossible dates.
{
  class Element{}
  const R={
    features:{register(){}},router:{register(){},current(){return'calendar'}},events:{on(){}},me:{id:'u1'},
    logs:[
      {user_id:'u1',date:'2026-09-14'},
      {user_id:'u1',date:'2026-09-14'},
      {user_id:'u2',date:'2026-09-14'},
      {user_id:'u1',date:'2026-02-30'}
    ]
  };
  const sandbox={window:{R},document:{querySelector(){return null}},Element,Intl,Date,Math,Number,String,Array,Object,Map,Set,Promise,console,setTimeout(){return 0}};
  vm.createContext(sandbox);vm.runInContext(calendar,sandbox,{filename:'app-calendar-ui.js'});
  const idx=R.calendarUI.dateIndex();
  check('calendar functionally counts only active-account valid dates',idx.get('2026-09-14')===2&&idx.size===1);
  check('calendar validator rejects February 30',R.calendarUI.validIsoDate('2026-02-30')===false);
  R.logs=[{user_id:'u1',date:'2026-09-15'}];
  const next=R.calendarUI.dateIndex();
  check('calendar reindexes when the loaded log array changes',next.get('2026-09-15')===1&&!next.has('2026-09-14'));
}

// Functional record-service checks: caller-provided stale audio cannot delete unrelated files.
{
  const removed=[];
  const R={
    me:{id:'u1'},logs:[],events:{emit(){}},features:{register(){}},reportError(){},
    S:{
      from(){return{
        select(){return{eq(){return this},maybeSingle:async()=>({data:{id:'r1',audio_path:'u1/canonical.webm'},error:null})}},
        update(payload){return{eq(){return this},select(){return this},maybeSingle:async()=>({data:{id:'r1',audio_path:payload.audio_path||null},error:null})}},
        insert:async()=>({error:null}),
        delete(){return{eq(){return this},select(){return this},maybeSingle:async()=>({data:{id:'r1',audio_path:null},error:null})}}
      }},
      storage:{from(){return{remove:async paths=>{removed.push(...paths);return{error:null}},createSignedUrl:async()=>({data:{signedUrl:'x'},error:null})}}}
    }
  };
  const sandbox={window:{R},Promise,Error,String,Object,Array,console};
  vm.createContext(sandbox);vm.runInContext(records,sandbox,{filename:'app-record-service.js'});
  await R.records.save({audio_path:'u1/new.webm'},{id:'r1',oldAudioPath:'u1/unrelated.webm'});
  check('record edit deletes the database canonical old audio, not caller stale audio',removed.length===1&&removed[0]==='u1/canonical.webm');
  R.logs=[{id:'r1',user_id:'u1',audio_path:'u1/stale-memory.webm'}];
  await R.records.remove('r1');
  check('record delete with null canonical audio does not delete stale memory audio',removed.length===1);
}

function fakeIndexedDB({readFails=false}={}){
  const stored=[];
  return{
    stored,
    open(){
      const request={};
      setTimeout(()=>{
        const db={
          objectStoreNames:{contains(){return true}},close(){},
          transaction(){
            const tx={error:null,oncomplete:null,onabort:null,onerror:null};
            tx.objectStore=()=>({
              add(value){const q={};setTimeout(()=>{stored.push({...value,id:stored.length+1});q.result=stored.length;q.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return q},
              put(value){const q={};setTimeout(()=>{q.result=value.id;q.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return q},
              getAll(){const q={};setTimeout(()=>{if(readFails){q.error=new Error('idb read failed');q.onerror?.()}else{q.result=[...stored];q.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)}},0);return q},
              delete(id){const q={};setTimeout(()=>{const i=stored.findIndex(x=>x.id===id);if(i>=0)stored.splice(i,1);q.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return q}
            });
            return tx
          }
        };
        request.result=db;request.onsuccess?.()
      },0);
      return request
    }
  }
}

function offlineSandbox(indexedDB,onLine){
  const reports=[];
  const R={
    me:{id:'u1'},features:{register(){}},events:{emit(){},on(){}},reportError:(e,c)=>reports.push(c),toast(){},
    S:{from(){return{upsert:async()=>({error:null})}}}
  };
  const document={querySelector(){return null}};
  const timer=(fn,ms=0)=>{if(ms>=500)return 0;return setTimeout(fn,0)};
  const sandbox={window:{R,indexedDB,addEventListener(){}},R,indexedDB,document,navigator:{onLine},crypto:{randomUUID:()=> 'queue-test-id'},Date,Math,Number,String,Object,Array,Map,Set,Promise,Error,console,setTimeout:timer,clearTimeout(){}};
  vm.createContext(sandbox);vm.runInContext(offline,sandbox,{filename:'app-offline-service.js'});
  return{R,reports}
}

// A successful IndexedDB write must not be reclassified as failure when only counting fails.
{
  const db=fakeIndexedDB({readFails:true}),{R,reports}=offlineSandbox(db,false);
  let rejected=false,result;
  try{result=await R.queueLog({station:'Test'})}catch{rejected=true}
  check('offline enqueue remains successful when post-write queue count cannot be read',!rejected&&result===null&&db.stored.length===1);
  check('offline enqueue reports the count-read problem for diagnostics',reports.includes('offline-queue-count'));
}

// Initial outbox read failure during synchronization must be visible, not treated as zero pending.
{
  const db=fakeIndexedDB({readFails:true}),{R}=offlineSandbox(db,true);
  let rejected=false;
  try{await R.syncOutbox('u1')}catch{rejected=true}
  check('offline synchronization rejects an IndexedDB read failure instead of claiming an empty queue',rejected);
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} denary-area hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
