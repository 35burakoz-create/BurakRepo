-- HFCC A26 transmitter completion without inventing unpublished site codes.
-- Official A26 schedule pages expose transmitter name + latitude/longitude.
-- For sites whose public schedule does not expose a site code, keep site_code NULL,
-- create an internal coordinate-backed reference, and link station_schedules by exact
-- unique HFCC coordinates. Internal source_key values must never leak into tx_site_code.

insert into public.transmitter_sites(
  provider,source_key,season,country_code,country_name,site_code,site_name,latitude,longitude,
  confidence,source_url,active,metadata
)
select
  'HFCC',
  'A26COORD:'||substr(md5(v.site_name||'|'||v.latitude::text||'|'||v.longitude::text),1,16),
  'A26',null,null,null,v.site_name,v.latitude,v.longitude,100,
  'https://new.hfcc.org/data/a26/',true,
  jsonb_build_object(
    'reference_basis','official_schedule_name_coordinates',
    'site_code_status','not_published_in_public_schedule',
    'source_season','A26',
    'source_note','HFCC A26 public schedule publishes transmitter name and coordinates but no public site code for this coordinate reference.'
  )
from (values
  ('Kununurra WA'::text,-15.8::numeric,128.6833333333333333::numeric),
  ('Bamako',12.65,-8.016666666666667),
  ('Duchanbe',38.666666666666667,68.833333333333333),
  ('Lampertheim',49.6,8.55),
  ('Vandiver, AL',33.5,-86.466666666666667),
  ('Bethel, PA',40.483333333333333,-76.283333333333333),
  ('Milton, FL',30.65,-87.083333333333333),
  ('New Orleans, LA',29.833333333333333,-90.116666666666667),
  ('Tchita',52.083333333333333,113.333333333333333),
  ('Xingyang',34.816666666666667,113.383333333333333),
  ('Zwolle',52.483333333333333,6.1)
) as v(site_name,latitude,longitude)
where not exists(
  select 1 from public.transmitter_sites t
  where t.provider='HFCC' and t.active=true
    and abs(t.latitude-v.latitude)<0.00001
    and abs(t.longitude-v.longitude)<0.00001
)
on conflict(provider,source_key) do update set
  season=excluded.season,
  site_code=null,
  site_name=excluded.site_name,
  latitude=excluded.latitude,
  longitude=excluded.longitude,
  confidence=excluded.confidence,
  source_url=excluded.source_url,
  active=true,
  metadata=public.transmitter_sites.metadata||excluded.metadata,
  updated_at=now();

create or replace function public.radio_assign_schedule_transmitter_site()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  wanted_provider text;
  wanted_key text;
  matched_count integer;
begin
  if new.source like 'HFCC %' then
    wanted_provider := 'HFCC';
    wanted_key := nullif(btrim(new.tx_site_code), '');

    if wanted_key is not null then
      select t.id into new.transmitter_site_id
      from public.transmitter_sites t
      where t.provider=wanted_provider
        and t.source_key=wanted_key
        and t.active=true
      limit 1;
      return new;
    end if;

    if new.latitude is null or new.longitude is null then
      new.transmitter_site_id := null;
      return new;
    end if;

    select count(*) into matched_count
    from public.transmitter_sites t
    where t.provider='HFCC'
      and t.active=true
      and abs(t.latitude-new.latitude)<0.00001
      and abs(t.longitude-new.longitude)<0.00001;

    if matched_count=1 then
      select t.id into new.transmitter_site_id
      from public.transmitter_sites t
      where t.provider='HFCC'
        and t.active=true
        and abs(t.latitude-new.latitude)<0.00001
        and abs(t.longitude-new.longitude)<0.00001
      limit 1;
    else
      new.transmitter_site_id := null;
    end if;
    return new;

  elsif new.source like 'EiBi %' then
    wanted_provider := 'EiBi';
    wanted_key := public.radio_eibi_transmitter_key(new.country,new.tx_site_code);
  else
    new.transmitter_site_id := null;
    return new;
  end if;

  if wanted_key is null then
    new.transmitter_site_id := null;
    return new;
  end if;

  select t.id into new.transmitter_site_id
  from public.transmitter_sites t
  where t.provider=wanted_provider
    and t.source_key=wanted_key
    and t.active=true
  limit 1;

  return new;
end
$$;

create or replace view private.hfcc_a26_production_candidates as
select s.*,coalesce(l.language_label,s.language_code) language_label,
  case when tm.match_count=1 then tm.site_code end resolved_tx_site_code,
  case when tm.match_count=1 then tm.country_name end resolved_country,
  case when tm.match_count=1 then tm.id end resolved_transmitter_site_id,
  coalesce(tm.match_count,0) transmitter_match_count
from private.hfcc_a26_stage s
left join private.hfcc_language_labels l on l.language_code=s.language_code
left join lateral(
  select t.id,t.source_key,t.site_code,t.country_name,count(*) over() match_count
  from public.transmitter_sites t
  where t.provider='HFCC'
    and t.active=true
    and abs(t.latitude-s.latitude)<0.00001
    and abs(t.longitude-s.longitude)<0.00001
  order by t.source_key
  limit 1
) tm on true
where s.receiver_compatible=true and s.operational_candidate=true;

update public.station_schedules s
set transmitter_site_id=t.id
from public.transmitter_sites t
where s.source='HFCC A26'
  and s.transmitter_site_id is null
  and t.provider='HFCC'
  and t.active=true
  and abs(t.latitude-s.latitude)<0.00001
  and abs(t.longitude-s.longitude)<0.00001
  and not exists(
    select 1 from public.transmitter_sites t2
    where t2.provider='HFCC'
      and t2.active=true
      and t2.id<>t.id
      and abs(t2.latitude-s.latitude)<0.00001
      and abs(t2.longitude-s.longitude)<0.00001
  );

comment on function public.radio_assign_schedule_transmitter_site() is
'HFCC rows prefer an official site code when present; if public HFCC data exposes only a unique official name+coordinate pair, the schedule may link by that coordinate reference without inventing tx_site_code. EiBi behavior remains code-key based.';

create or replace function radio_private.hfcc_a26_data_quality()
returns table(check_name text,severity text,failures bigint,details text)
language sql stable set search_path=''
as $$
  select 'hfcc_band_coverage','error',case when count(distinct band)=10 then 0 else 1 end::bigint,'HFCC A26 üretim verisi Tecsun SW1–SW10 bantlarının tamamını kapsamalı.' from public.station_schedules where source='HFCC A26'
  union all select 'hfcc_receiver_range','error',count(*)::bigint,'HFCC A26 üretim satırlarının her biri Tecsun R-9012 bant sınıflandırmasıyla eşleşmeli.' from public.station_schedules s where source='HFCC A26' and private.tecsun_r9012_sw_band(s.frequency) is distinct from s.band
  union all select 'hfcc_qa_rows','error',count(*)::bigint,'Başarılı tam reimport sonrasında HFCC_QA satırı kalmamalı.' from public.station_schedules where source='HFCC A26' and band='HFCC_QA'
  union all select 'hfcc_canonical_missing','error',count(*)::bigint,'HFCC A26 üretim satırlarında canonical_station_id eksik olmamalı.' from public.station_schedules where source='HFCC A26' and canonical_station_id is null
  union all select 'hfcc_coordinate_missing','error',count(*)::bigint,'Resmî HFCC satırlarında verici koordinatı eksik olmamalı.' from public.station_schedules where source='HFCC A26' and (latitude is null or longitude is null)
  union all select 'hfcc_11530_receiver_leak','error',count(*)::bigint,'11530 kHz resmî kaynakta korunmalı fakat Tecsun bant dışında olduğundan üretim rehberine girmemeli.' from public.station_schedules where source='HFCC A26' and frequency=11530
  union all select 'hfcc_21480_missing','error',case when exists(select 1 from public.station_schedules where source='HFCC A26' and frequency=21480 and band='SW10') then 0 else 1 end::bigint,'21480 kHz tam beş haneli frekans olarak SW10 içinde bulunmalı.'
  union all select 'hfcc_stale_guide_rows','error',count(*)::bigint,'Aktif HFCC A26 guide satırlarının schedule karşılığı bulunmalı.' from public.guide_entries g where g.external_key like 'A26:HFCC A26:%' and coalesce(g.source_section,'')<>'Arşivlenmiş A26 çizelgesi' and not exists(select 1 from public.station_schedules s where s.source='HFCC A26' and g.external_key='A26:HFCC A26:'||s.source_record_id::text)
  union all select 'hfcc_coordinate_reference_code_leak','error',count(*)::bigint,'Koordinat-temelli iç HFCC referans anahtarı tx_site_code alanına sızmamalı.' from public.station_schedules where source='HFCC A26' and tx_site_code like 'A26COORD:%'
  union all select 'hfcc_transmitter_unlinked','info',count(*)::bigint,'Resmî HFCC koordinatına karşılık gelen tekil verici referansı bulunamayan satırlar.' from public.station_schedules where source='HFCC A26' and transmitter_site_id is null;
$$;

revoke all on function radio_private.hfcc_a26_data_quality() from public,anon,authenticated;
