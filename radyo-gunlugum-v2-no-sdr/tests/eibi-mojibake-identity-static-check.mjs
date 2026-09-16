import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const sql=fs.readFileSync(path.join(root,'sql/20260916_clean_eibi_mojibake_station_identity.sql'),'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)process.exitCode=1};

check('cleanup removes malformed aliases by known byte signatures',sql.includes('delete from public.station_aliases')&&sql.includes("'(f1a1bb|f3aebb|f3aea0)'"));
check('cleanup removes orphan malformed canonical rows without UUID-specific delete',sql.includes('delete from public.canonical_stations')&&!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(sql));
check('Radio Exterior malformed UTF-8 signature is guarded',sql.includes('f1a1bb'));
check('Radio Educación malformed UTF-8 signature is guarded',sql.includes('f3aebb'));
check('Estación 4940 malformed UTF-8 signature is guarded',sql.includes('f3aea0'));
check('canonical station names reject known EiBi mojibake only',sql.includes('canonical_stations_known_eibi_mojibake_guard')&&sql.includes("convert_to(canonical_name,'UTF8')"));
check('station aliases reject known EiBi mojibake only',sql.includes('station_aliases_known_eibi_mojibake_guard')&&sql.includes("convert_to(alias,'UTF8')"));
check('schedule display names reject known EiBi mojibake only',sql.includes('station_schedules_known_eibi_mojibake_guard')&&sql.includes("convert_to(station,'UTF8')"));
check('guide display names reject known EiBi mojibake only',sql.includes('guide_entries_known_eibi_mojibake_guard')&&sql.includes("convert_to(station,'UTF8')"));
check('all guards are validated after cleanup',(sql.match(/validate constraint .*known_eibi_mojibake_guard/g)||[]).length===4);
check('guard does not ban all non-ASCII or all four-byte Unicode',!sql.includes('ascii(')&&!sql.includes('octet_length')&&!sql.includes('4-byte'));
check('raw provenance is explicitly preserved outside display identity',sql.includes('Raw import provenance can remain in source metadata'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} EiBi mojibake identity checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));

// Keep the permanent byte-parser regression in the same EiBi CI gate.
await import('./eibi-csv-parser-static-check.mjs');
