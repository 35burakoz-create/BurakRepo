import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const station=read('app-station-intelligence.js');
const bootstrap=read('app-bootstrap.js');
const sw=read('sw.js');
const config=read('app-config.js');
const foundationSql=read('sql/20260915_station_identity_foundation.sql');
const repairSql=read('sql/20260915_station_identity_key_repair.sql');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

let syntax=true;try{new vm.Script(station,{filename:'app-station-intelligence.js'})}catch{syntax=false}
check('station intelligence module syntax',syntax);
check('bootstrap loads station identity before current programs',bootstrap.indexOf("'app-station-intelligence.js'")>0&&bootstrap.indexOf("'app-station-intelligence.js'")<bootstrap.indexOf("'app-current-programs.js'"));
check('PWA caches station identity module',sw.includes("'./app-station-intelligence.js'"));
check('station identity release follows current PWA generation',config.includes("cacheVersion:'v385-core-boundary-radio-intelligence-20260915-51'"));
check('canonical schema creates stations aliases and source provenance',foundationSql.includes('create table if not exists public.canonical_stations')&&foundationSql.includes('create table if not exists public.station_aliases')&&foundationSql.includes('create table if not exists public.station_source_links'));
check('canonical catalog is authenticated read-only',foundationSql.includes('grant select on public.canonical_stations to authenticated')&&foundationSql.includes('revoke all on public.canonical_stations from anon, authenticated')&&foundationSql.includes('enable row level security'));
check('guide and personal records receive canonical station foreign keys',foundationSql.includes('guide_entries_canonical_station_fkey')&&foundationSql.includes('radio_logs_canonical_station_fkey')&&foundationSql.includes('radio_session_attempts_canonical_station_fkey')&&foundationSql.includes('radio_dial_calibrations_canonical_station_fkey'));
check('future catalog writes assign or create canonical identities',foundationSql.includes('radio_assign_catalog_canonical_station')&&foundationSql.includes('guide_entries_assign_canonical_station')&&foundationSql.includes('station_schedules_assign_canonical_station'));
check('user records only resolve known station identities',foundationSql.includes('radio_assign_known_canonical_station')&&foundationSql.includes('radio_logs_assign_canonical_station')&&foundationSql.includes('radio_favorites_assign_canonical_station'));
check('guide provenance stays synchronized',foundationSql.includes('radio_sync_guide_station_source_link')&&foundationSql.includes('guide_entries_sync_station_source_link'));
check('canonical history indexes support future personal models',foundationSql.includes('radio_logs_user_canonical_station_idx')&&foundationSql.includes('radio_session_attempts_user_canonical_station_idx'));
check('normalization repair uses POSIX whitespace class',repairSql.includes("'[[:space:]]+'")&&!repairSql.includes("E'\\s+'"));
check('normalization repair rebuilds identities from source guide rows',repairSql.includes('delete from public.canonical_stations')&&repairSql.includes("'normalization','whitespace_repair'")&&repairSql.includes('update public.guide_entries g'));
check('client station catalog is bounded and paged',station.includes('PAGE_SIZE=1000,MAX_ROWS=10000')&&station.includes('for(let from=0;from<MAX_ROWS;from+=PAGE_SIZE)')&&station.includes(".range(MAX_ROWS,MAX_ROWS)"));
check('client requests server-normalized canonical keys',station.includes('canonical_name,normalized_name,status')&&station.includes('alias,normalized_alias'));
check('client resolves canonical id before name fallback',station.includes('value?.canonical_station_id||value?.canonicalStationId')&&station.includes('canonicalIdForName'));
check('client refuses ambiguous alias resolution',station.includes('ids?.size===1'));
check('client keeps original guide station alias when canonicalizing display',station.includes("row._source_station=current")&&station.includes('replaceStation:true'));
check('client does not rewrite journal station text',station.includes('for(const row of R.logs||[])attach(row)'));
check('account logout clears in-memory identity catalog',station.includes("if(!x?.authenticated||!userId){clear();return}"));
check('identity readiness is announced to the app',station.includes("'station:identity-ready'"));

const handlers=new Map();
const events={on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},emit(){}};
const rows={
  canonical_stations:[{id:'c1',canonical_name:'BBC World Service',normalized_name:'bbcworldservice',status:'active',merged_into_id:null,metadata:{},updated_at:'2026-09-15T00:00:00Z'}],
  station_aliases:[{id:'a1',canonical_station_id:'c1',alias:'BBC WS',normalized_alias:'bbcws',source:'test',confidence:90,metadata:{}}]
};
function query(table){let current=rows[table]||[];return{select(){return this},order(){return this},range(from,to){return Promise.resolve({data:current.slice(from,to+1),error:null})}}}
const R={
  me:{id:'u1'},
  S:{from:query},
  events,
  features:{register(){}},
  reportError(){},
  store:{sync(){}},
  guideEntries:[{id:'g1',canonical_station_id:'c1',station:'BBC WS'}],
  schedules:[{id:'s1',canonical_station_id:'c1',station:'BBC WS'}],
  logs:[{id:'l1',canonical_station_id:'c1',station:'BBC WS'}]
};
const context={window:{R},console,Map,Set,Promise,String,Array,Object,Number,Intl,setTimeout(){return 0},clearTimeout(){}};
vm.runInNewContext(station,context,{filename:'app-station-intelligence.js'});
const api=R.stationIntelligence;
check('functional station service is exposed',!!api&&typeof api.ensureData==='function'&&typeof api.displayName==='function');
check('functional whitespace cleaner removes control characters',api.cleanName(' BBC\r\n  World\tService ')==='BBC World Service');
check('functional client key preserves accented letters like PostgreSQL',api.key('RÁDIO-Test 1')==='rádiotest1');
check('functional client key uses database-style lowercase I instead of Turkish locale folding',api.key('RADIO I')==='radioi');
await api.ensureData();
check('functional canonical rows load for active account',api.loaded===true&&api.stations.length===1&&api.aliases.length===1);
check('functional alias resolves to exactly one canonical station',api.canonicalIdForName('BBC WS')==='c1');
check('functional canonical id resolves preferred display name',api.displayName({canonical_station_id:'c1',station:'BBC WS'})==='BBC World Service');
check('functional guide display is canonicalized while source alias is kept',R.guideEntries[0].station==='BBC World Service'&&R.guideEntries[0]._source_station==='BBC WS');
check('functional journal text is preserved while canonical label is attached',R.logs[0].station==='BBC WS'&&R.logs[0].canonical_station_name==='BBC World Service');
check('functional same-station comparison prefers canonical ids',api.sameStation({canonical_station_id:'c1',station:'X'},{canonical_station_id:'c1',station:'Y'})===true);
api.clear({emit:false});
check('functional catalog clear removes account-scoped client cache',api.loaded===false&&R.canonicalStations.length===0&&R.stationAliases.length===0);

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} station-identity hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
