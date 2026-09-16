-- HFCC A26 -> Tecsun R-9012 import hardening.
-- Official source: https://new.hfcc.org/data/a26/
-- The production database received the equivalent migrations on 2026-09-15.
-- Follow-up coordinate-only transmitter linking is in 20260916_hfcc_coordinate_reference_linking.sql.
-- This file is intentionally idempotent and does not run a rebuild automatically.
-- Safe operator flow:
--   select private.refresh_hfcc_a26_stage();
--   select private.rebuild_hfcc_a26_for_tecsun();
--   select * from radio_private.hfcc_a26_data_quality();

create table if not exists private.hfcc_a26_stage (
  row_key text primary key,
  source_record_id bigint not null unique,
  broadcaster_code text not null,
  frequency numeric not null,
  start_hhmm text not null,
  stop_hhmm text not null,
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 0 and 1440),
  target text,
  station text not null,
  fmo_code text,
  language_code text,
  tx_site_name text,
  latitude_text text,
  longitude_text text,
  latitude numeric,
  longitude numeric,
  beam_text text,
  azimuth_deg numeric check (azimuth_deg is null or azimuth_deg between 0 and 360),
  power_kw numeric check (power_kw is null or power_kw >= 0),
  days text,
  days_iso text,
  valid_from date,
  valid_to date,
  notes text,
  receiver_band text,
  receiver_compatible boolean not null default false,
  operational_candidate boolean not null default true,
  source_url text not null,
  fetched_at timestamptz not null default now(),
  check (valid_from is null or valid_to is null or valid_from <= valid_to),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);
revoke all on private.hfcc_a26_stage from public, anon, authenticated;

create table if not exists private.hfcc_a26_fetch_log(
  broadcaster_code text primary key,
  row_count integer not null check(row_count>=0),
  source_url text not null,
  fetched_at timestamptz not null default now()
);
revoke all on private.hfcc_a26_fetch_log from public, anon, authenticated;

create table if not exists private.hfcc_language_labels(
  language_code text primary key,
  language_label text not null,
  source text not null default 'legacy_schedule_modal',
  updated_at timestamptz not null default now()
);
revoke all on private.hfcc_language_labels from public, anon, authenticated;

create table if not exists private.hfcc_a26_import_runs(
  run_id uuid primary key default gen_random_uuid(),
  source_updated date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  staged_rows integer not null,
  candidate_rows integer not null,
  inserted_rows integer,
  transmitter_linked_rows integer,
  archived_guide_rows integer,
  deleted_stale_guide_rows integer,
  status text not null default 'running',
  details jsonb not null default '{}'::jsonb
);
revoke all on private.hfcc_a26_import_runs from public, anon, authenticated;

create table if not exists private.hfcc_a26_schedule_backup(
  run_id uuid not null references private.hfcc_a26_import_runs(run_id) on delete cascade,
  schedule_id uuid not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key(run_id,schedule_id)
);
revoke all on private.hfcc_a26_schedule_backup from public, anon, authenticated;

create table if not exists private.hfcc_a26_guide_backup(
  run_id uuid not null references private.hfcc_a26_import_runs(run_id) on delete cascade,
  guide_entry_id uuid not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key(run_id,guide_entry_id)
);
revoke all on private.hfcc_a26_guide_backup from public, anon, authenticated;

create or replace function private.hfcc_clean_cell(p_text text)
returns text language sql immutable set search_path=''
as $$
  select nullif(btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(coalesce(p_text,''),
      '&amp;','&'),'&quot;','"'),'&#039;',''''),'&#39;',''''),'&apos;',''''),'&nbsp;',' '),'&lt;','<'),
    '[[:cntrl:][:space:]]+',' ','g')), '');
$$;

create or replace function private.hfcc_coordinate(p_text text,p_axis text)
returns numeric language plpgsql immutable set search_path=''
as $$
declare s text:=upper(btrim(coalesce(p_text,''))); deg numeric; mins numeric; hemi text;
begin
  if s='' then return null; end if;
  if p_axis='lat' and s !~ '^[0-9]{2}[NS][0-9]{2}$' then return null; end if;
  if p_axis='lon' and s !~ '^[0-9]{3}[EW][0-9]{2}$' then return null; end if;
  hemi:=substring(s from '[NSEW]');
  deg:=split_part(s,hemi,1)::numeric; mins:=split_part(s,hemi,2)::numeric;
  if mins>=60 or (p_axis='lat' and deg>90) or (p_axis='lon' and deg>180) then return null; end if;
  return (deg+mins/60)*case when hemi in ('S','W') then -1 else 1 end;
end;
$$;

create or replace function private.tecsun_r9012_sw_band(p_frequency numeric)
returns text language sql immutable set search_path=''
as $$
  select case
    when p_frequency between 3900 and 4000 then 'SW1'
    when p_frequency between 4750 and 5060 then 'SW2'
    when p_frequency between 5950 and 6200 then 'SW3'
    when p_frequency between 7100 and 7300 then 'SW4'
    when p_frequency between 9500 and 9900 then 'SW5'
    when p_frequency between 11650 and 12050 then 'SW6'
    when p_frequency between 13600 and 13800 then 'SW7'
    when p_frequency between 15100 and 15600 then 'SW8'
    when p_frequency between 17550 and 17900 then 'SW9'
    when p_frequency between 21450 and 21850 then 'SW10'
    else null end;
$$;

create or replace function private.hfcc_stage_broadcaster(p_code text)
returns integer language plpgsql set search_path=''
as $$
declare
  v_code text:=upper(btrim(coalesce(p_code,''))); v_url text; v_status integer; v_html text;
  v_part text; v_row text; v_cells text[]; v_frequency numeric; v_start integer; v_stop integer;
  v_lat numeric; v_lon numeric; v_band text; v_row_key text; v_record_id bigint; v_inserted integer:=0;
begin
  if v_code !~ '^[A-Z0-9]{2,5}$' then raise exception 'Invalid HFCC broadcaster code'; end if;
  v_url:='https://new.hfcc.org/data/schedbybrc.php?broadc='||v_code||'&seas=A26';
  select status,content into v_status,v_html from extensions.http_get(v_url);
  if v_status<>200 or v_html is null or position('A26 Schedule' in v_html)=0 then
    raise exception 'HFCC fetch failed for % (status %)',v_code,v_status;
  end if;
  delete from private.hfcc_a26_stage where broadcaster_code=v_code;
  for v_part in select regexp_split_to_table(v_html,'</TR>') loop
    if position('<TR>' in v_part)=0 or position('bodycells' in v_part)=0 then continue; end if;
    v_row:=split_part(v_part,'<TR>',2);
    select array_agg(private.hfcc_clean_cell(
      regexp_replace(regexp_replace(c.cell,'^[[:space:]]*<TD[^>]*>',''),'<[^>]+>','','g')) order by c.ord)
    into v_cells
    from regexp_split_to_table(v_row,'</TD>') with ordinality as c(cell,ord)
    where position('<TD' in c.cell)>0;
    if coalesce(cardinality(v_cells),0)<>16 then continue; end if;
    if v_cells[1] !~ '^[0-9]+([.][0-9]+)?$' or v_cells[2] !~ '^[0-9]{4}$' or v_cells[3] !~ '^[0-9]{4}$' then continue; end if;
    v_frequency:=v_cells[1]::numeric;
    v_start:=left(v_cells[2],2)::integer*60+right(v_cells[2],2)::integer;
    v_stop:=case when v_cells[3]='2400' then 1440 else left(v_cells[3],2)::integer*60+right(v_cells[3],2)::integer end;
    if v_start not between 0 and 1439 or v_stop not between 0 and 1440 then continue; end if;
    if right(v_cells[2],2)::integer>59 or (v_cells[3]<>'2400' and right(v_cells[3],2)::integer>59) then continue; end if;
    v_lat:=private.hfcc_coordinate(v_cells[9],'lat'); v_lon:=private.hfcc_coordinate(v_cells[10],'lon');
    v_band:=private.tecsun_r9012_sw_band(v_frequency);
    v_row_key:=md5(v_code||chr(31)||array_to_string(v_cells,chr(31),'<NULL>'));
    v_record_id:=('x'||substr(v_row_key,1,15))::bit(60)::bigint;
    insert into private.hfcc_a26_stage(
      row_key,source_record_id,broadcaster_code,frequency,start_hhmm,stop_hhmm,start_minute,end_minute,
      target,station,fmo_code,language_code,tx_site_name,latitude_text,longitude_text,latitude,longitude,
      beam_text,azimuth_deg,power_kw,days,days_iso,valid_from,valid_to,notes,receiver_band,
      receiver_compatible,operational_candidate,source_url)
    values(
      v_row_key,v_record_id,v_code,v_frequency,v_cells[2],v_cells[3],v_start,v_stop,v_cells[4],v_cells[5],v_cells[6],v_cells[7],
      v_cells[8],v_cells[9],v_cells[10],v_lat,v_lon,v_cells[11],
      case when upper(coalesce(v_cells[11],''))='ND' then 0 when v_cells[11]~'^[0-9]+([.][0-9]+)?$' then v_cells[11]::numeric end,
      case when v_cells[12]~'^[0-9]+([.][0-9]+)?$' then v_cells[12]::numeric end,
      coalesce(v_cells[13],'1234567'),private.normalize_hfcc_days(coalesce(v_cells[13],'1234567')),
      case when v_cells[14] is null then null else to_date(v_cells[14],'DD-Mon-YYYY') end,
      case when v_cells[15] is null then null else to_date(v_cells[15],'DD-Mon-YYYY') end,
      v_cells[16],v_band,(v_band is not null),
      not(v_code='RDR' or lower(coalesce(v_cells[5],''))='for new organization' or coalesce(v_cells[16],'') ilike '%Dummy Req%'),v_url)
    on conflict(row_key) do update set
      source_record_id=excluded.source_record_id,frequency=excluded.frequency,start_hhmm=excluded.start_hhmm,stop_hhmm=excluded.stop_hhmm,
      start_minute=excluded.start_minute,end_minute=excluded.end_minute,target=excluded.target,station=excluded.station,fmo_code=excluded.fmo_code,
      language_code=excluded.language_code,tx_site_name=excluded.tx_site_name,latitude_text=excluded.latitude_text,longitude_text=excluded.longitude_text,
      latitude=excluded.latitude,longitude=excluded.longitude,beam_text=excluded.beam_text,azimuth_deg=excluded.azimuth_deg,power_kw=excluded.power_kw,
      days=excluded.days,days_iso=excluded.days_iso,valid_from=excluded.valid_from,valid_to=excluded.valid_to,notes=excluded.notes,
      receiver_band=excluded.receiver_band,receiver_compatible=excluded.receiver_compatible,operational_candidate=excluded.operational_candidate,
      source_url=excluded.source_url,fetched_at=now();
    v_inserted:=v_inserted+1;
  end loop;
  return v_inserted;
end;
$$;

create or replace function private.hfcc_stage_broadcaster_logged(p_code text)
returns integer language plpgsql set search_path=''
as $$
declare v_code text:=upper(btrim(coalesce(p_code,''))); v_rows integer; v_url text;
begin
  v_rows:=private.hfcc_stage_broadcaster(v_code);
  v_url:='https://new.hfcc.org/data/schedbybrc.php?broadc='||v_code||'&seas=A26';
  insert into private.hfcc_a26_fetch_log(broadcaster_code,row_count,source_url,fetched_at)
  values(v_code,v_rows,v_url,now())
  on conflict(broadcaster_code) do update set row_count=excluded.row_count,source_url=excluded.source_url,fetched_at=excluded.fetched_at;
  return v_rows;
end;
$$;

create or replace function private.hfcc_a26_expected_broadcaster_codes()
returns table(code text) language plpgsql set search_path=''
as $$
declare v_status integer; v_html text;
begin
  select status,content into v_status,v_html from extensions.http_get('https://new.hfcc.org/data/a26/');
  if v_status<>200 or v_html is null then raise exception 'HFCC A26 index fetch failed (status %)',v_status; end if;
  return query select distinct m[1]::text from regexp_matches(v_html,'broadc=([A-Z0-9]+)','g') m order by 1;
end;
$$;

create or replace function private.hfcc_a26_source_updated()
returns date language plpgsql set search_path=''
as $$
declare v_status integer; v_html text; v_match text[];
begin
  select status,content into v_status,v_html from extensions.http_get('https://new.hfcc.org/data/a26/');
  if v_status<>200 or v_html is null then raise exception 'HFCC A26 index fetch failed (status %)',v_status; end if;
  v_match:=regexp_match(v_html,'Last updated on[[:space:]]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})');
  if v_match is null then return null; end if;
  return to_date(v_match[1],'DD-Mon-YYYY');
end;
$$;

create or replace function private.refresh_hfcc_a26_stage()
returns jsonb language plpgsql set search_path=''
as $$
declare v_code text; v_rows integer; v_total integer:=0; v_codes integer:=0;
begin
  for v_code in select code from private.hfcc_a26_expected_broadcaster_codes() order by code loop
    v_rows:=private.hfcc_stage_broadcaster_logged(v_code); v_total:=v_total+v_rows; v_codes:=v_codes+1;
  end loop;
  delete from private.hfcc_a26_stage s where not exists(select 1 from private.hfcc_a26_expected_broadcaster_codes() e where e.code=s.broadcaster_code);
  delete from private.hfcc_a26_fetch_log f where not exists(select 1 from private.hfcc_a26_expected_broadcaster_codes() e where e.code=f.broadcaster_code);
  return jsonb_build_object('broadcaster_codes',v_codes,'parsed_rows',v_total,'staged_unique_rows',(select count(*) from private.hfcc_a26_stage));
end;
$$;

with ranked as (
  select language_code,btrim(language) language_label,count(*) n,
    row_number() over(partition by language_code order by count(*) desc,btrim(language)) rn
  from public.station_schedules
  where language_code is not null and btrim(language_code)<>'' and language is not null and btrim(language)<>''
    and not exists(select 1 from generate_series(1,char_length(language)) g where ascii(substr(language,g,1))>65535)
  group by language_code,btrim(language)
)
insert into private.hfcc_language_labels(language_code,language_label)
select language_code,language_label from ranked where rn=1
on conflict(language_code) do update set language_label=excluded.language_label,updated_at=now();

create or replace view private.hfcc_a26_production_candidates as
select s.*,coalesce(l.language_label,s.language_code) language_label,
  case when tm.match_count=1 then tm.source_key end resolved_tx_site_code,
  case when tm.match_count=1 then tm.country_name end resolved_country,
  case when tm.match_count=1 then tm.id end resolved_transmitter_site_id,
  coalesce(tm.match_count,0) transmitter_match_count
from private.hfcc_a26_stage s
left join private.hfcc_language_labels l on l.language_code=s.language_code
left join lateral(
  select t.id,t.source_key,t.country_name,count(*) over() match_count
  from public.transmitter_sites t
  where t.provider='HFCC' and t.active=true and abs(t.latitude-s.latitude)<0.00001 and abs(t.longitude-s.longitude)<0.00001
  order by t.source_key limit 1
) tm on true
where s.receiver_compatible=true and s.operational_candidate=true;

create or replace function private.rebuild_hfcc_a26_for_tecsun()
returns jsonb language plpgsql set search_path=''
as $$
declare
  v_expected integer; v_logged integer; v_missing integer; v_mismatch integer; v_stage integer; v_candidates integer; v_bands integer;
  v_source_updated date; v_run uuid; v_inserted integer; v_linked integer; v_archived integer:=0; v_deleted integer:=0; v_sync integer:=0;
  v_bad integer; v_expected_linked integer;
begin
  select count(*) into v_expected from private.hfcc_a26_expected_broadcaster_codes();
  select count(*) into v_logged from private.hfcc_a26_fetch_log;
  select count(*) into v_missing from private.hfcc_a26_expected_broadcaster_codes() e left join private.hfcc_a26_fetch_log f on f.broadcaster_code=e.code where f.broadcaster_code is null;
  select count(*) into v_mismatch from private.hfcc_a26_fetch_log f
    left join(select broadcaster_code,count(*)::integer n from private.hfcc_a26_stage group by broadcaster_code)s using(broadcaster_code)
    where f.row_count<>coalesce(s.n,0);
  select count(*) into v_stage from private.hfcc_a26_stage;
  select count(*) into v_candidates from private.hfcc_a26_production_candidates;
  select count(distinct receiver_band) into v_bands from private.hfcc_a26_production_candidates;
  v_source_updated:=private.hfcc_a26_source_updated();
  if v_expected<70 or v_logged<v_expected or v_missing<>0 or v_mismatch<>0 then raise exception 'HFCC staging incomplete'; end if;
  if (select min(fetched_at) from private.hfcc_a26_fetch_log)<now()-interval '2 hours' then raise exception 'HFCC staging is stale'; end if;
  if v_stage<3000 or v_candidates<2000 or v_bands<>10 then raise exception 'HFCC staging quality gate failed'; end if;
  if not exists(select 1 from private.hfcc_a26_stage where frequency=11530) then raise exception 'HFCC sentinel 11530 missing'; end if;
  if exists(select 1 from private.hfcc_a26_production_candidates where frequency=11530) then raise exception '11530 must remain outside Tecsun receiver bands'; end if;
  if not exists(select 1 from private.hfcc_a26_production_candidates where frequency=21480 and receiver_band='SW10') then raise exception 'HFCC sentinel 21480 missing from SW10'; end if;
  select count(*) into v_bad from private.hfcc_a26_production_candidates
   where source_record_id<=0 or latitude is null or longitude is null or station is null or language_code is null
      or receiver_band is distinct from private.tecsun_r9012_sw_band(frequency) or valid_from is null or valid_to is null or valid_from>valid_to;
  if v_bad<>0 then raise exception 'HFCC candidate validation failed'; end if;

  insert into private.hfcc_a26_import_runs(source_updated,staged_rows,candidate_rows,details)
  values(v_source_updated,v_stage,v_candidates,jsonb_build_object('expected_broadcaster_codes',v_expected)) returning run_id into v_run;
  insert into private.hfcc_a26_schedule_backup(run_id,schedule_id,row_data)
    select v_run,id,to_jsonb(s) from public.station_schedules s where source='HFCC A26';
  insert into private.hfcc_a26_guide_backup(run_id,guide_entry_id,row_data)
    select v_run,id,to_jsonb(g) from public.guide_entries g where external_key like 'A26:HFCC A26:%';
  delete from public.station_schedules where source='HFCC A26';

  insert into public.station_schedules(
    band,frequency,start_time,end_time,station,language,country,program_hint,source,valid_from,valid_to,notes,season,source_record_id,
    days,days_iso,start_minute,end_minute,all_day,language_code,target,broadcaster_code,tx_site_code,tx_site_name,latitude,longitude,power_kw,azimuth_deg,persistence_code)
  select c.receiver_band,c.frequency,make_time((c.start_minute/60)::int,(c.start_minute%60)::int,0),
    case when c.end_minute=1440 then time '00:00:00' else make_time((c.end_minute/60)::int,(c.end_minute%60)::int,0) end,
    c.station,c.language_label,c.resolved_country,null,'HFCC A26',c.valid_from,c.valid_to,c.notes,'A26',c.source_record_id,
    c.days,c.days_iso,c.start_minute,c.end_minute,(c.start_minute=0 and c.end_minute=1440),c.language_code,c.target,c.broadcaster_code,
    c.resolved_tx_site_code,c.tx_site_name,c.latitude,c.longitude,c.power_kw,c.azimuth_deg,null
  from private.hfcc_a26_production_candidates c;
  get diagnostics v_inserted=row_count;
  if v_inserted<>v_candidates then raise exception 'HFCC insert count mismatch'; end if;
  select count(*) into v_expected_linked from private.hfcc_a26_production_candidates where transmitter_match_count=1;
  select count(*) into v_linked from public.station_schedules where source='HFCC A26' and transmitter_site_id is not null;
  if v_linked<>v_expected_linked then raise exception 'HFCC transmitter link mismatch'; end if;
  select private.sync_a26_guide_entries() into v_sync;

  with stale as(
    select g.id from public.guide_entries g where g.external_key like 'A26:HFCC A26:%'
      and not exists(select 1 from public.station_schedules s where s.source='HFCC A26' and g.external_key='A26:HFCC A26:'||s.source_record_id::text)
  ),referenced as(
    select s.id from stale s where exists(select 1 from public.radio_favorites f where f.guide_entry_id=s.id)
      or exists(select 1 from public.radio_reminders r where r.guide_entry_id=s.id)
  )
  update public.guide_entries g set valid_to=least(coalesce(g.valid_to,current_date-1),current_date-1),
    source_section='Arşivlenmiş A26 çizelgesi',action_hint='Güncel HFCC A26 çizelgesinde artık yer almıyor.',
    raw=coalesce(g.raw,'{}'::jsonb)||jsonb_build_object('schedule_retired_at',now(),'schedule_retired_reason','not_in_current_hfcc_a26')
  where g.id in(select id from referenced);
  get diagnostics v_archived=row_count;

  delete from public.guide_entries g where g.external_key like 'A26:HFCC A26:%'
    and not exists(select 1 from public.station_schedules s where s.source='HFCC A26' and g.external_key='A26:HFCC A26:'||s.source_record_id::text)
    and not exists(select 1 from public.radio_favorites f where f.guide_entry_id=g.id)
    and not exists(select 1 from public.radio_reminders r where r.guide_entry_id=g.id);
  get diagnostics v_deleted=row_count;

  if exists(select 1 from public.station_schedules where source='HFCC A26' and frequency=11530) then raise exception '11530 leaked into production'; end if;
  if not exists(select 1 from public.station_schedules where source='HFCC A26' and frequency=21480 and band='SW10') then raise exception '21480 missing after import'; end if;
  if (select count(distinct band) from public.station_schedules where source='HFCC A26')<>10 then raise exception 'HFCC band coverage incomplete'; end if;
  if exists(select 1 from public.station_schedules where source='HFCC A26' and (band='HFCC_QA' or canonical_station_id is null or latitude is null or longitude is null)) then raise exception 'HFCC post-import validation failed'; end if;

  update private.hfcc_a26_import_runs set completed_at=now(),status='completed',inserted_rows=v_inserted,transmitter_linked_rows=v_linked,
    archived_guide_rows=v_archived,deleted_stale_guide_rows=v_deleted,details=details||jsonb_build_object('guide_sync_rows',v_sync,'expected_transmitter_links',v_expected_linked)
  where run_id=v_run;
  return jsonb_build_object('run_id',v_run,'source_updated',v_source_updated,'staged_rows',v_stage,'candidate_rows',v_candidates,
    'inserted_rows',v_inserted,'transmitter_linked_rows',v_linked,'archived_guide_rows',v_archived,'deleted_stale_guide_rows',v_deleted,'guide_sync_rows',v_sync);
end;
$$;

create or replace function radio_private.hfcc_a26_data_quality()
returns table(check_name text,severity text,failures bigint,details text)
language sql stable set search_path=''
as $$
  select 'hfcc_band_coverage','error',case when count(distinct band)=10 then 0 else 1 end::bigint,'HFCC A26 üretim verisi Tecsun SW1–SW10 bantlarının tamamını kapsamalı.' from public.station_schedules where source='HFCC A26'
  union all select 'hfcc_receiver_range','error',count(*)::bigint,'HFCC A26 üretim satırlarının her biri Tecsun R-9012 bant sınıflandırmasıyla eşleşmeli.' from public.station_schedules s where source='HFCC A26' and private.tecsun_r9012_sw_band(s.frequency) is distinct from s.band
  union all select 'hfcc_qa_rows','error',count(*)::bigint,'Başarılı tam reimport sonrasında HFCC_QA satırı kalmamalı.' from public.station_schedules where source='HFCC A26' and band='HFCC_QA'
  union all select 'hfcc_canonical_missing','error',count(*)::bigint,'HFCC A26 üretim satırlarında canonical_station_id eksik olmamalı.' from public.station_schedules where source='HFCC A26' and canonical_station_id is null
  union all select 'hfcc_coordinate_missing','error',count(*)::bigint,'Resmî HFCC satırlarında verici koordinatı eksik olmamalı.' from public.station_schedules where source='HFCC A26' and (latitude is null or longitude is null)
  union all select 'hfcc_11530_receiver_leak','error',count(*)::bigint,'11530 kHz kaynakta korunmalı fakat Tecsun bant dışında olduğundan üretim rehberine girmemeli.' from public.station_schedules where source='HFCC A26' and frequency=11530
  union all select 'hfcc_21480_missing','error',case when exists(select 1 from public.station_schedules where source='HFCC A26' and frequency=21480 and band='SW10') then 0 else 1 end::bigint,'21480 kHz tam beş haneli frekans olarak SW10 içinde bulunmalı.'
  union all select 'hfcc_stale_guide_rows','error',count(*)::bigint,'Aktif HFCC A26 guide satırlarının schedule karşılığı bulunmalı.' from public.guide_entries g where g.external_key like 'A26:HFCC A26:%' and coalesce(g.source_section,'')<>'Arşivlenmiş A26 çizelgesi' and not exists(select 1 from public.station_schedules s where s.source='HFCC A26' and g.external_key='A26:HFCC A26:'||s.source_record_id::text)
  union all select 'hfcc_transmitter_unlinked','info',count(*)::bigint,'Resmî ad ve koordinat mevcut olduğu halde HFCC site kodu kataloğunda henüz tekil eşleşmeyen satırlar.' from public.station_schedules where source='HFCC A26' and transmitter_site_id is null;
$$;

revoke all on function private.hfcc_clean_cell(text) from public,anon,authenticated;
revoke all on function private.hfcc_coordinate(text,text) from public,anon,authenticated;
revoke all on function private.tecsun_r9012_sw_band(numeric) from public,anon,authenticated;
revoke all on function private.hfcc_stage_broadcaster(text) from public,anon,authenticated;
revoke all on function private.hfcc_stage_broadcaster_logged(text) from public,anon,authenticated;
revoke all on function private.hfcc_a26_expected_broadcaster_codes() from public,anon,authenticated;
revoke all on function private.hfcc_a26_source_updated() from public,anon,authenticated;
revoke all on function private.refresh_hfcc_a26_stage() from public,anon,authenticated;
revoke all on function private.rebuild_hfcc_a26_for_tecsun() from public,anon,authenticated;
revoke all on function radio_private.hfcc_a26_data_quality() from public,anon,authenticated;