import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const sql=fs.readFileSync(path.join(root,'sql/20260916_mw_target_geography_model.sql'),'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)process.exitCode=1};

check('target geography table exists',sql.includes('create table if not exists public.radio_target_geographies'));
check('target geography table is RLS protected',sql.includes('alter table public.radio_target_geographies enable row level security'));
check('anonymous target geography reads are revoked',sql.includes('revoke all on public.radio_target_geographies from public, anon'));
check('authenticated target geography reads are explicit',sql.includes('grant select on public.radio_target_geographies to authenticated'));
check('Natural Earth provenance is pinned',sql.includes('Natural Earth Admin-0 Countries')&&sql.includes("'5.1.1'"));
check('EiBi target definition provenance is pinned',sql.includes('http://www.eibispace.de/dx/README.TXT'));
check('model declares coarse proximity rather than polygon certainty',sql.includes('not polygon containment'));
for(const code of ['NAF','WAF','EAF','SAF','SAS','CAS','SEA','EEU','FE','ME','CAU','SAM','CAM','CAR','EU','NAM','CEU']){
  check(`${code} regional target is modeled`,sql.includes(`('${code}'`));
}
for(const code of ['HNG','TWN','CHN','IRN','AFG','NIG','ROU','TUN','B','PAK','BGD','BLR','FIN','J','CUB','USA','UKR']){
  check(`${code} observed country target is modeled`,sql.includes(`('${code}'`));
}
check('large country radii are explicitly capped',sql.includes('bbox-corner radius capped at 2500 km'));
check('exact country-code match remains strongest',sql.includes("if c<>'' and t=c then return 8"));
check('global target remains mildly positive',sql.includes("if t='GLO' then return 2"));
check('compass target codes are neutral rather than mistaken for countries',sql.includes("'WNW'")&&sql.includes("'WSW'")&&sql.includes('return 0'));
check('region proximity has bounded positive and negative adjustments',sql.includes("p_geography_kind='region'")&&sql.includes('return 5')&&sql.includes('return -6'));
check('country proximity has bounded positive and negative adjustments',sql.includes("p_geography_kind='country'")&&sql.includes('edge_km<=750')&&sql.includes('edge_km<=3500'));
check('unknown target codes fall back to prior safe semantics',sql.includes('return public.radio_target_adjustment_country(t,c)'));
check('target geography is joined once in MW candidate query',sql.includes('left join public.radio_target_geographies tg on tg.target_code=upper'));
check('MW candidate query uses pure joined-value helper',sql.includes('radio_target_adjustment_geo_values(m.target,v_country,v_lat,v_lon,tg.geography_kind,tg.center_lat,tg.center_lon,tg.radius_km)'));
check('coordinate-only listener can still get target relevance',sql.includes('nullif(btrim(v_country)')&&sql.includes('v_lat is not null and v_lon is not null'));
check('obsolete per-row table lookup helper is removed',sql.includes('drop function if exists public.radio_target_adjustment_geo(text,text,numeric,numeric)'));
check('pure helper is not anonymous RPC surface',sql.includes('revoke all on function public.radio_target_adjustment_geo_values')&&sql.includes('from public, anon'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} MW target-geography checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
