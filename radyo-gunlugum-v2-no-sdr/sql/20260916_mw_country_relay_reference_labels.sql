-- MW transmitter-reference enrichment for EiBi A26 / Tecsun R-9012.
-- Current EiBi README: http://www.eibispace.de/dx/README.TXT
-- EiBi explicitly permits use/copy/distribution and third-party software use.
-- Important precision rule: /CYP, /KGZ, /TJK and /KWT identify relay countries,
-- not a unique transmitter site. They must never be promoted to precise coordinates.

insert into public.transmitter_site_references(
  code_provider,source_key,country_code,site_code,site_name,official_site_name,
  label_source,label_source_url,operation_status,operation_source,operation_source_url,
  operation_verified_on,verified_frequency_khz,program_name,metadata,active
)
values
  ('EiBi','CYP','CYP','/CYP','Cyprus relay — exact site not specified',null,
   'EiBi A26 README transmitter-site codes','http://www.eibispace.de/dx/README.TXT','unverified',null,null,null,null,null,
   jsonb_build_object('precision','country_only','evidence','EiBi /CYP country-level relay marker','do_not_geocode',true),true),
  ('EiBi','KGZ','KGZ','/KGZ','Kyrgyzstan relay — exact site not specified',null,
   'EiBi A26 README transmitter-site codes','http://www.eibispace.de/dx/README.TXT','unverified',null,null,null,null,null,
   jsonb_build_object('precision','country_only','evidence','EiBi /KGZ country-level relay marker','do_not_geocode',true),true),
  ('EiBi','TJK','TJK','/TJK','Tajikistan relay — exact site not specified',null,
   'EiBi A26 README transmitter-site codes','http://www.eibispace.de/dx/README.TXT','unverified',null,null,null,null,null,
   jsonb_build_object('precision','country_only','evidence','EiBi /TJK country-level relay marker','do_not_geocode',true),true),
  ('EiBi','KWT','KWT','/KWT','Kuwait relay — exact site not specified',null,
   'EiBi A26 README transmitter-site codes','http://www.eibispace.de/dx/README.TXT','unverified',null,null,null,null,null,
   jsonb_build_object('precision','country_only','evidence','EiBi /KWT country-level relay marker','do_not_geocode',true),true)
on conflict(code_provider,source_key) do update set
  country_code=excluded.country_code,
  site_code=excluded.site_code,
  site_name=excluded.site_name,
  official_site_name=null,
  label_source=excluded.label_source,
  label_source_url=excluded.label_source_url,
  operation_status='unverified',
  operation_source=null,
  operation_source_url=null,
  operation_verified_on=null,
  verified_frequency_khz=null,
  program_name=null,
  metadata=public.transmitter_site_references.metadata||excluded.metadata,
  active=true,
  updated_at=now();

create or replace view public.mw_schedule_enriched
with (security_invoker=true)
as
select
  s.id,s.source,s.season,s.source_record_id,s.frequency,s.start_time,s.end_time,s.start_minute,s.end_minute,
  s.days,s.days_iso,s.station,s.language,s.language_code,s.country,s.target,s.broadcaster_code,s.tx_site_code,
  s.power_kw,s.azimuth_deg,s.valid_from,s.valid_to,s.canonical_station_id,cs.canonical_name,s.transmitter_site_id,
  ts.source_key as transmitter_source_key,
  coalesce(ts.site_name,ref.site_name) as transmitter_site_name,
  ts.latitude as transmitter_latitude,
  ts.longitude as transmitter_longitude,
  case
    when s.transmitter_site_id is not null then 'resolved'
    when nullif(btrim(s.tx_site_code),'') is null then 'site_code_missing'
    when s.tx_site_code='xx' then 'site_unknown'
    when s.tx_site_code ~ '^/[A-Z]{1,3}$' then 'relay_host_country_only'
    when ref.id is not null then 'site_code_known_ungeocoded'
    else 'site_code_unresolved'
  end as transmitter_resolution,
  case
    when mod(s.frequency::integer,9)=0 and mod(s.frequency::integer,10)=0 then '9_and_10_khz_grid'
    when mod(s.frequency::integer,9)=0 then '9_khz_grid'
    when mod(s.frequency::integer,10)=0 then '10_khz_grid'
    else 'off_grid_or_special'
  end as channel_grid,
  true as tecsun_r9012_mw_range_compatible,
  'current_schedule_reference'::text as data_role,
  ref.id as transmitter_reference_id,
  ref.operation_status as transmitter_operation_status,
  ref.operation_source as transmitter_operation_source,
  ref.operation_verified_on as transmitter_operation_verified_on,
  ref.verified_frequency_khz as transmitter_verified_frequency_khz,
  ref.official_site_name as transmitter_official_site_name,
  ref.operation_timezone as transmitter_operation_timezone,
  ref.operation_start_local as transmitter_operation_start_local,
  ref.operation_end_local as transmitter_operation_end_local,
  case
    when ref.operation_status<>'current_official' or ref.operation_timezone is null or ref.operation_start_local is null or ref.operation_end_local is null then false
    when ref.operation_start_local=ref.operation_end_local then true
    when ref.operation_start_local<ref.operation_end_local then
      (now() at time zone ref.operation_timezone)::time >= ref.operation_start_local
      and (now() at time zone ref.operation_timezone)::time < ref.operation_end_local
    else
      (now() at time zone ref.operation_timezone)::time >= ref.operation_start_local
      or (now() at time zone ref.operation_timezone)::time < ref.operation_end_local
  end as official_service_active_now,
  ref.operation_hours_source as transmitter_operation_hours_source
from public.station_schedules s
left join public.canonical_stations cs on cs.id=s.canonical_station_id
left join public.transmitter_sites ts on ts.id=s.transmitter_site_id and ts.active=true
left join public.transmitter_site_references ref on ref.active=true and ref.code_provider='EiBi'
  and ref.source_key=public.radio_eibi_transmitter_key(s.country,s.tx_site_code)
where s.band='MW' and s.frequency between 525 and 1610 and s.source='EiBi A26';

revoke all on public.mw_schedule_enriched from public,anon;
grant select on public.mw_schedule_enriched to authenticated;

comment on view public.mw_schedule_enriched is
'EiBi A26 medium-wave reference view for Tecsun R-9012. Country-level relay markers such as /CYP, /KGZ, /TJK and /KWT are intentionally labelled but never promoted to a precise transmitter location. Regulatory plans are not proof of current operation.';

create or replace function radio_private.catalog_data_quality()
returns table(check_name text,severity text,failures bigint,details text)
language sql
set search_path to ''
as $$
  select 'hfcc_frequency_guard','error',count(*)::bigint,'HFCC_QA dışındaki HFCC satırlarında 2300 kHz altı kayıt olmamalı.'
  from public.station_schedules where source like 'HFCC%' and band<>'HFCC_QA' and frequency<2300

  union all select 'eibi_numeric_site_code','error',count(*)::bigint,'EiBi tx_site_code persistence sayısı (1/2/...) olamaz.'
  from public.station_schedules where source='EiBi A26' and tx_site_code ~ '^[0-9]+$'

  union all select 'eibi_invalid_persistence','error',count(*)::bigint,'EiBi persistence kodu README sözlüğündeki 0,1,2,3,4,5,6,8 veya 90+ varyantlarından olmalı.'
  from public.station_schedules where source='EiBi A26' and persistence_code is not null and persistence_code !~ '^(0|1|2|3|4|5|6|8|9[0-8])$'

  union all select 'eibi_nonbmp_station_text','error',count(*)::bigint,'Kaynak encoding birleşmesiyle oluşan supplementary-plane istasyon karakterleri olmamalı.'
  from public.station_schedules s where s.source='EiBi A26'
    and exists(select 1 from generate_series(1,char_length(s.station)) g where ascii(substr(s.station,g,1))>65535)

  union all select 'guide_snapshot_drift','error',count(*)::bigint,'A26 guide snapshot alanları canonical schedule ile eşleşmeli.'
  from public.guide_entries g join public.station_schedules s
    on s.source='EiBi A26' and g.external_key='A26:EiBi A26:'||s.source_record_id::text
  where g.station is distinct from s.station
     or nullif(g.language_content,'') is distinct from nullif(s.language_code,'')
     or g.canonical_station_id is distinct from s.canonical_station_id
     or nullif(g.raw->'schedule'->>'target','') is distinct from nullif(s.target,'')
     or nullif(g.raw->'schedule'->>'tx_site_code','') is distinct from nullif(s.tx_site_code,'')
     or nullif(g.raw->'schedule'->>'language_code','') is distinct from nullif(s.language_code,'')
     or nullif(g.raw->'schedule'->>'persistence_code','') is distinct from nullif(s.persistence_code,'')

  union all select 'mw_receiver_range','error',count(*)::bigint,'EiBi MW kayıtları Tecsun R-9012 için 525–1610 kHz aralığında olmalı.'
  from public.station_schedules where source='EiBi A26' and band='MW' and frequency not between 525 and 1610

  union all select 'mw_canonical_missing','error',count(*)::bigint,'MW üretim rehberinde canonical_station_id eksik olmamalı.'
  from public.station_schedules where source='EiBi A26' and band='MW' and canonical_station_id is null

  union all select 'mw_site_code_unresolved','error',count(*)::bigint,'Kod taşıyan MW satırlarında çözümsüz verici anahtarı kalmamalı; kesin saha bilinmiyorsa ülke-düzeyi röle veya geocode edilmemiş referans olarak sınıflanmalı.'
  from public.mw_schedule_enriched where transmitter_resolution='site_code_unresolved'

  union all select 'mw_country_relay_geocoded','error',count(*)::bigint,'/CYP, /KGZ, /TJK, /KWT gibi ülke-düzeyi EiBi röle işaretleri kesin verici koordinatına yükseltilmemeli.'
  from public.station_schedules where source='EiBi A26' and band='MW' and tx_site_code ~ '^/[A-Z]{1,3}$' and transmitter_site_id is not null

  union all select 'mw_country_relay_reference_precision','error',count(*)::bigint,'Ülke-düzeyi EiBi röle referansları country_only ve do_not_geocode olarak işaretlenmeli.'
  from public.transmitter_site_references r
  where r.active=true and r.code_provider='EiBi' and r.source_key in ('CYP','KGZ','TJK','KWT')
    and (r.metadata->>'precision' is distinct from 'country_only' or coalesce((r.metadata->>'do_not_geocode')::boolean,false)=false)

  union all select 'active_transmitter_bad_coordinates','error',count(*)::bigint,'Aktif verici koordinatları fiziksel aralıkta olmalı.'
  from public.transmitter_sites where active=true and (latitude not between -90 and 90 or longitude not between -180 and 180)

  union all select 'schedule_linked_to_inactive_site','error',count(*)::bigint,'Çizelge aktif olmayan transmitter_sites kaydına bağlı kalmamalı.'
  from public.station_schedules s join public.transmitter_sites t on t.id=s.transmitter_site_id where t.active=false

  union all select 'invalid_user_timezone','error',count(*)::bigint,'Kullanıcı varsayılan timezone değeri pg_timezone_names içinde olmalı.'
  from public.radio_user_settings u where not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=u.default_timezone)

  union all select 'invalid_session_timezone','error',count(*)::bigint,'Dinleme oturumu timezone değeri pg_timezone_names içinde olmalı.'
  from public.radio_listening_sessions s where not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=s.timezone)

  union all select 'stale_geometry_algorithm_version','error',count(*)::bigint,'Geometry cache satırları calculation_version >= 2 olmalı.'
  from public.radio_transmitter_geometry_cache where calculation_version<2

  union all select 'merged_canonical_live_schedule_refs','error',count(*)::bigint,'Merged canonical istasyonlara canlı schedule referansı kalmamalı.'
  from public.station_schedules s join public.canonical_stations c on c.id=s.canonical_station_id where c.status='merged'

  union all select 'merged_canonical_live_guide_refs','error',count(*)::bigint,'Merged canonical istasyonlara guide referansı kalmamalı.'
  from public.guide_entries g join public.canonical_stations c on c.id=g.canonical_station_id where c.status='merged'

  union all select 'transmitter_reference_duplicate_active_key','error',coalesce(sum(x.n-1),0)::bigint,'Aynı provider/source_key için birden fazla aktif koordinatsız verici referansı olmamalı.'
  from (select code_provider,source_key,count(*)::bigint n from public.transmitter_site_references where active=true group by code_provider,source_key having count(*)>1) x

  union all select 'mw_reference_join_missing','error',count(*)::bigint,'Aktif EiBi verici referansı olan MW satırı enriched view içinde transmitter_reference_id kaybetmemeli.'
  from public.station_schedules s
  join public.transmitter_site_references r on r.active=true and r.code_provider='EiBi' and r.source_key=public.radio_eibi_transmitter_key(s.country,s.tx_site_code)
  left join public.mw_schedule_enriched m on m.id=s.id
  where s.source='EiBi A26' and s.band='MW' and m.transmitter_reference_id is null

  union all select 'propagation_site_snapshot_resolver_mismatch','error',count(*)::bigint,'Saklanmış propagation transmitter snapshot, aynı gözlem zamanı için güncel belirsizlik-korumalı resolver ile çelişmemeli.'
  from (
    select l.canonical_station_id,l.band,l.frequency,l.propagation_transmitter_site_id stored,l.observed_at_utc observed_at
    from public.radio_logs l where l.propagation_transmitter_site_id is not null and l.canonical_station_id is not null
    union all
    select a.canonical_station_id,a.band,a.frequency,a.propagation_transmitter_site_id,a.attempted_at
    from public.radio_session_attempts a where a.propagation_transmitter_site_id is not null and a.canonical_station_id is not null
  ) q
  where public.radio_resolve_schedule_transmitter_site(q.canonical_station_id,q.band,q.frequency,q.observed_at) is distinct from q.stored

  union all select 'mw_known_ungeocoded_site_rows','info',count(*)::bigint,'Saha adı/referansı doğrulanmış ancak koordinatı olmadığı için mesafe-yön hesaplanmayan MW satırları.'
  from public.mw_schedule_enriched where transmitter_resolution='site_code_known_ungeocoded'

  union all select 'mw_country_relay_rows','info',count(*)::bigint,'EiBi yalnız röle ülkesini veriyor; tam verici sahası bilinmediğinden mesafe-yön hesabı yapılmıyor.'
  from public.mw_schedule_enriched where transmitter_resolution='relay_host_country_only'

  union all select 'mw_site_code_missing_rows','info',count(*)::bigint,'EiBi satırında verici site kodu bulunmuyor; coğrafi puan temkinli/nötr kalır.'
  from public.mw_schedule_enriched where transmitter_resolution='site_code_missing'

  union all select 'mw_transmitter_not_geocoded','info',count(*)::bigint,'Koordinatı bilinmeyen veya yalnız röle ülkesi bilinen MW satırları; hata değildir, coğrafi puan nötr/temkinli kalır.'
  from public.mw_schedule_enriched where transmitter_resolution<>'resolved';
$$;

revoke all on function radio_private.catalog_data_quality() from public,anon,authenticated;
