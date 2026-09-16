-- EiBi target-area proximity model for MW ranking.
-- Target definitions: http://www.eibispace.de/dx/README.TXT
-- Geography reference: Natural Earth Admin-0 Countries v5.1.1 (public domain).
-- This is deliberately a coarse center/radius proximity model, not polygon containment.

create table if not exists public.radio_target_geographies (
  target_code text primary key,
  label_tr text not null,
  geography_kind text not null check (geography_kind in ('region','country')),
  center_lat numeric not null check (center_lat between -90 and 90),
  center_lon numeric not null check (center_lon between -180 and 180),
  radius_km numeric not null check (radius_km >= 0),
  source_name text not null,
  source_url text not null,
  source_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.radio_target_geographies enable row level security;
revoke all on public.radio_target_geographies from public, anon;
grant select on public.radio_target_geographies to authenticated;
drop policy if exists radio_target_geographies_authenticated_read on public.radio_target_geographies;
create policy radio_target_geographies_authenticated_read
on public.radio_target_geographies for select to authenticated using (true);

with seed(target_code,label_tr,geography_kind,center_lat,center_lon,radius_km,metadata) as (values
 ('CAM','Orta Amerika','region',14.505::numeric,-88.347::numeric,2298::numeric,'{"eibi_target":"CAm","derivation":"Natural Earth Central America label points; radius=max label distance + 500 km"}'::jsonb),
 ('CAR','Karayipler','region',19.068,-71.817,1974,'{"eibi_target":"Car","derivation":"Natural Earth Caribbean label points; radius=max label distance + 500 km"}'),
 ('CAS','Orta Asya','region',42.094,67.698,1297,'{"eibi_target":"CAs","derivation":"Natural Earth Central Asia label points; radius=max label distance + 500 km"}'),
 ('CAU','Kafkasya','region',40.911,45.249,675,'{"eibi_target":"Cau","derivation":"Armenia+Azerbaijan+Georgia label points; radius=max label distance + 500 km"}'),
 ('CEU','Orta Avrupa','region',48.619,14.944,1098,'{"eibi_target":"CEu","derivation":"reviewed Central-Europe country set; radius=max label distance + 500 km"}'),
 ('EAF','Doğu Afrika','region',-2.016,36.406,2661,'{"eibi_target":"EAf","derivation":"Natural Earth Eastern Africa label points; radius=max label distance + 500 km"}'),
 ('EEU','Doğu Avrupa','region',48.546,23.616,1182,'{"eibi_target":"EEu","derivation":"Natural Earth Eastern Europe label points excluding transcontinental whole-Russia geometry; radius=max label distance + 500 km"}'),
 ('EU','Avrupa','region',49.553,14.409,3064,'{"eibi_target":"Eu","derivation":"Natural Earth Europe label points excluding transcontinental whole-Russia geometry; radius=max label distance + 500 km"}'),
 ('FE','Uzak Doğu','region',35.760,120.729,2293,'{"eibi_target":"FE","derivation":"Natural Earth Eastern Asia label points; radius=max label distance + 500 km"}'),
 ('ME','Orta Doğu','region',31.296,42.319,2312,'{"eibi_target":"ME","derivation":"Natural Earth Western Asia plus Egypt and Iran; radius=max label distance + 500 km"}'),
 ('NAF','Kuzey Afrika','region',26.551,9.817,2807,'{"eibi_target":"NAf","derivation":"Natural Earth Northern Africa label points; radius=max label distance + 500 km"}'),
 ('NAM','Kuzey Amerika','region',58.061,-79.576,2964,'{"eibi_target":"NAm","derivation":"Natural Earth Northern America label points; radius=max label distance + 500 km"}'),
 ('SAF','Güney Afrika','region',-25.680,24.933,1481,'{"eibi_target":"SAf","derivation":"Natural Earth Southern Africa label points; radius=max label distance + 500 km"}'),
 ('SAM','Güney Amerika','region',-15.467,-63.786,4544,'{"eibi_target":"SAm","derivation":"Natural Earth South America label points; radius=max label distance + 500 km"}'),
 ('SAS','Güney Asya','region',25.747,76.675,2728,'{"eibi_target":"SAs","derivation":"Natural Earth Southern Asia label points; radius=max label distance + 500 km"}'),
 ('SEA','Güneydoğu Asya','region',9.925,108.791,3312,'{"eibi_target":"SEA","derivation":"Natural Earth South-Eastern Asia label points; radius=max label distance + 500 km"}'),
 ('WAF','Batı Afrika','region',11.920,-4.991,2175,'{"eibi_target":"WAf","derivation":"Natural Earth Western Africa label points; radius=max label distance + 500 km"}'),
 ('AFG','Afganistan','country',34.164,66.497,980,'{"derivation":"country label point; radius from bbox corners"}'),
 ('B','Brezilya','country',-12.099,-49.559,2500,'{"natural_earth_iso3":"BRA","derivation":"country label point; bbox-corner radius capped at 2500 km"}'),
 ('BGD','Bangladeş','country',24.215,89.685,500,'{"derivation":"country label point; radius from bbox corners"}'),
 ('BLR','Belarus','country',53.822,28.418,449,'{"derivation":"country label point; radius from bbox corners"}'),
 ('CHN','Çin','country',32.498,106.337,2500,'{"derivation":"country label point; bbox-corner radius capped at 2500 km"}'),
 ('CUB','Küba','country',21.334,-77.976,749,'{"derivation":"country label point; radius from bbox corners"}'),
 ('FIN','Finlandiya','country',63.252,27.276,821,'{"derivation":"country label point; radius from bbox corners"}'),
 ('HNG','Macaristan','country',47.087,19.448,297,'{"natural_earth_iso3":"HUN","derivation":"country label point; radius from bbox corners"}'),
 ('IRN','İran','country',32.166,54.931,1317,'{"derivation":"country label point; radius from bbox corners"}'),
 ('J','Japonya','country',36.143,138.442,1291,'{"natural_earth_iso3":"JPN","derivation":"country label point; radius from bbox corners"}'),
 ('NIG','Nijerya','country',9.440,7.503,972,'{"natural_earth_iso3":"NGA","derivation":"country label point; radius from bbox corners"}'),
 ('PAK','Pakistan','country',29.328,68.546,1224,'{"derivation":"country label point; radius from bbox corners"}'),
 ('ROU','Romanya','country',45.733,24.973,454,'{"derivation":"country label point; radius from bbox corners"}'),
 ('TUN','Tunus','country',33.687,9.008,465,'{"derivation":"country label point; radius from bbox corners"}'),
 ('TWN','Tayvan','country',23.652,120.868,218,'{"derivation":"country label point; radius from bbox corners"}'),
 ('UKR','Ukrayna','country',49.725,32.141,901,'{"derivation":"country label point; radius from bbox corners"}'),
 ('USA','Amerika Birleşik Devletleri','country',39.538,-97.483,2500,'{"derivation":"country label point; bbox-corner radius capped at 2500 km"}')
)
insert into public.radio_target_geographies(
  target_code,label_tr,geography_kind,center_lat,center_lon,radius_km,
  source_name,source_url,source_version,metadata
)
select target_code,label_tr,geography_kind,center_lat,center_lon,radius_km,
       'Natural Earth Admin-0 Countries',
       'https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson',
       '5.1.1',
       metadata || jsonb_build_object('eibi_definition_source','http://www.eibispace.de/dx/README.TXT')
from seed
on conflict (target_code) do update set
  label_tr=excluded.label_tr,
  geography_kind=excluded.geography_kind,
  center_lat=excluded.center_lat,
  center_lon=excluded.center_lon,
  radius_km=excluded.radius_km,
  source_name=excluded.source_name,
  source_url=excluded.source_url,
  source_version=excluded.source_version,
  metadata=excluded.metadata,
  updated_at=now();

create or replace function public.radio_target_adjustment_geo_values(
  p_target text,
  p_country_code text,
  p_lat numeric,
  p_lon numeric,
  p_geography_kind text,
  p_center_lat numeric,
  p_center_lon numeric,
  p_radius_km numeric
)
returns integer
language plpgsql
stable
set search_path to ''
as $$
declare
  t text := upper(btrim(coalesce(p_target,'')));
  c text := upper(btrim(coalesce(p_country_code,'')));
  d numeric;
  edge_km numeric;
begin
  if t='' then return 0; end if;
  if c<>'' and t=c then return 8; end if;
  if t='GLO' then return 2; end if;

  -- EiBi also allows compass-direction target codes. Antenna azimuth already handles
  -- directional alignment when known, so these are neutral rather than mistaken for countries.
  if t in ('N','NE','NNE','NW','NNW','S','SE','SSE','SW','SSW','E','ENE','ESE','W','WNW','WSW') then
    return 0;
  end if;

  if p_lat between -90 and 90 and p_lon between -180 and 180
     and p_center_lat is not null and p_center_lon is not null and p_radius_km is not null then
    d := public.radio_geo_distance_km(p_lat,p_lon,p_center_lat,p_center_lon);
    edge_km := greatest(0,d-p_radius_km);

    if p_geography_kind='region' then
      if edge_km=0 then return 5;
      elsif edge_km<=1000 then return 3;
      elsif edge_km<=2500 then return 1;
      elsif edge_km<=5000 then return -2;
      else return -6;
      end if;
    elsif p_geography_kind='country' then
      if edge_km=0 then return 5;
      elsif edge_km<=750 then return 3;
      elsif edge_km<=1800 then return 1;
      elsif edge_km<=3500 then return -2;
      else return -6;
      end if;
    end if;
  end if;

  return public.radio_target_adjustment_country(t,c);
end;
$$;

revoke all on function public.radio_target_adjustment_geo_values(text,text,numeric,numeric,text,numeric,numeric,numeric) from public, anon;
grant execute on function public.radio_target_adjustment_geo_values(text,text,numeric,numeric,text,numeric,numeric,numeric) to authenticated, service_role;

do $$
declare v_sql text;
begin
  select pg_get_functiondef('public.radio_mw_now_candidates(integer)'::regprocedure) into v_sql;

  v_sql := replace(
    v_sql,
    'public.radio_target_adjustment_country(m.target,v_country) as target_bonus',
    'public.radio_target_adjustment_geo_values(m.target,v_country,v_lat,v_lon,tg.geography_kind,tg.center_lat,tg.center_lon,tg.radius_km) as target_bonus'
  );

  if position('radio_target_geographies tg' in v_sql)=0 then
    v_sql := replace(
      v_sql,
      $needle$from public.mw_schedule_enriched m$needle$,
      $repl$from public.mw_schedule_enriched m
    left join public.radio_target_geographies tg on tg.target_code=upper(btrim(coalesce(m.target,'')))$repl$
    );
  end if;

  v_sql := replace(
    v_sql,
    '(nullif(btrim(m.target),'''') is not null and nullif(btrim(v_country),'''') is not null)',
    '(nullif(btrim(m.target),'''') is not null and (nullif(btrim(v_country),'''') is not null or (v_lat is not null and v_lon is not null)))'
  );

  execute v_sql;
end;
$$;

drop function if exists public.radio_target_adjustment_geo(text,text,numeric,numeric);

comment on table public.radio_target_geographies is
'Coarse EiBi target-area geography model derived from Natural Earth Admin-0 v5.1.1 public-domain country label points. Values support ranking proximity only; they are not political boundary claims or polygon containment tests.';
comment on function public.radio_target_adjustment_geo_values(text,text,numeric,numeric,text,numeric,numeric,numeric) is
'Pure per-row target proximity scoring helper. Target geography is joined once by the caller to avoid repeated table lookups.';
