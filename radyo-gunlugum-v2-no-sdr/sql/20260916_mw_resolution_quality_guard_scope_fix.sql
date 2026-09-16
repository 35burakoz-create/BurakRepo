-- Scope correction for MW relay precision guard.
-- EiBi slash-country markers are not all equivalent: some countries have a documented
-- default transmitter site (for example ARM/BES/MDA). Only CYP/KGZ/TJK/KWT are
-- ambiguous in the current README because no single default site is published.

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

  union all select 'mw_ambiguous_country_relay_geocoded','error',count(*)::bigint,'CYP/KGZ/TJK/KWT gibi README içinde tek bir varsayılan saha göstermeyen ülke-düzeyi röle işaretleri kesin verici koordinatına yükseltilmemeli.'
  from public.station_schedules s
  where s.source='EiBi A26' and s.band='MW' and s.transmitter_site_id is not null
    and public.radio_eibi_transmitter_key(s.country,s.tx_site_code) in ('CYP','KGZ','TJK','KWT')

  union all select 'mw_country_relay_reference_precision','error',count(*)::bigint,'Belirsiz ülke-düzeyi EiBi röle referansları country_only ve do_not_geocode olarak işaretlenmeli.'
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

  union all select 'mw_country_relay_rows','info',count(*)::bigint,'EiBi yalnız röle ülkesini veriyor ve kesin saha çözülemiyor; mesafe-yön hesabı yapılmıyor.'
  from public.mw_schedule_enriched where transmitter_resolution='relay_host_country_only'

  union all select 'mw_site_code_missing_rows','info',count(*)::bigint,'EiBi satırında verici site kodu bulunmuyor; coğrafi puan temkinli/nötr kalır.'
  from public.mw_schedule_enriched where transmitter_resolution='site_code_missing'

  union all select 'mw_transmitter_not_geocoded','info',count(*)::bigint,'Koordinatı bilinmeyen veya yalnız röle ülkesi bilinen MW satırları; hata değildir, coğrafi puan nötr/temkinli kalır.'
  from public.mw_schedule_enriched where transmitter_resolution<>'resolved';
$$;

revoke all on function radio_private.catalog_data_quality() from public,anon,authenticated;
