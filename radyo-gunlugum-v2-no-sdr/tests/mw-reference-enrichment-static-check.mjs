import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const sql=fs.readFileSync(path.join(root,'sql/20260916_mw_country_relay_reference_labels.sql'),'utf8');
const qualitySql=fs.readFileSync(path.join(root,'sql/20260916_mw_resolution_quality_guard_scope_fix.sql'),'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)process.exitCode=1};

check('current EiBi README provenance is pinned',sql.includes('http://www.eibispace.de/dx/README.TXT'));
for(const [key,code,label] of [
  ['CYP','/CYP','Cyprus relay — exact site not specified'],
  ['KGZ','/KGZ','Kyrgyzstan relay — exact site not specified'],
  ['TJK','/TJK','Tajikistan relay — exact site not specified'],
  ['KWT','/KWT','Kuwait relay — exact site not specified']
]){
  check(`${key} remains country-level`,sql.includes(`'EiBi','${key}','${key}','${code}','${label}'`));
}
check('country relays are explicitly non-geocodable',sql.includes("'precision','country_only'")&&sql.includes("'do_not_geocode',true"));
check('country relay operation is not claimed as current',sql.includes("'unverified',null,null,null,null,null"));
check('relay-host classification precedes generic reference classification',sql.indexOf("s.tx_site_code ~ '^/[A-Z]{1,3}$'")<sql.indexOf("when ref.id is not null then 'site_code_known_ungeocoded'"));
check('country relays never receive coordinates in this migration',!sql.includes('insert into public.transmitter_sites'));
check('view remains security invoker',sql.includes('create or replace view public.mw_schedule_enriched\nwith (security_invoker=true)'));
check('anonymous access stays revoked',sql.includes('revoke all on public.mw_schedule_enriched from public,anon'));
check('authenticated users retain read-only view access',sql.includes('grant select on public.mw_schedule_enriched to authenticated'));
check('reference join uses normalized EiBi key',sql.includes('ref.source_key=public.radio_eibi_transmitter_key(s.country,s.tx_site_code)'));
check('country-only operation window cannot become active',sql.includes("when ref.operation_status<>'current_official'")&&sql.includes('then false'));
check('regulatory plans are not treated as current operation proof',sql.includes('Regulatory plans are not proof of current operation'));

check('unresolved coded MW rows are a hard quality failure',qualitySql.includes("'mw_site_code_unresolved','error'"));
check('geocode guard is scoped only to ambiguous relay countries',qualitySql.includes("'mw_ambiguous_country_relay_geocoded','error'")&&qualitySql.includes("radio_eibi_transmitter_key(s.country,s.tx_site_code) in ('CYP','KGZ','TJK','KWT')"));
check('broad slash-country geocode ban is not the final rule',!qualitySql.includes("tx_site_code ~ '^/[A-Z]{1,3}$' and transmitter_site_id is not null"));
check('default-site slash countries are explicitly preserved by scope rationale',qualitySql.includes('ARM/BES/MDA'));
check('country-only metadata precision is audited',qualitySql.includes("'mw_country_relay_reference_precision','error'")&&qualitySql.includes("source_key in ('CYP','KGZ','TJK','KWT')"));
check('quality report keeps uncertainty visible as info',qualitySql.includes("'mw_country_relay_rows','info'")&&qualitySql.includes("'mw_known_ungeocoded_site_rows','info'")&&qualitySql.includes("'mw_site_code_missing_rows','info'"));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} MW reference-enrichment checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
