begin;

drop trigger if exists guide_entries_sync_station_source_link on public.guide_entries;
drop trigger if exists guide_entries_assign_canonical_station on public.guide_entries;
drop trigger if exists station_schedules_assign_canonical_station on public.station_schedules;
drop trigger if exists radio_station_contacts_assign_canonical_station on public.radio_station_contacts;
drop trigger if exists radio_logs_assign_canonical_station on public.radio_logs;
drop trigger if exists radio_favorites_assign_canonical_station on public.radio_favorites;
drop trigger if exists radio_reminders_assign_canonical_station on public.radio_reminders;
drop trigger if exists radio_session_attempts_assign_canonical_station on public.radio_session_attempts;
drop trigger if exists radio_dial_calibrations_assign_canonical_station on public.radio_dial_calibrations;

update public.guide_entries set canonical_station_id=null where canonical_station_id is not null;
update public.station_schedules set canonical_station_id=null where canonical_station_id is not null;
update public.radio_station_contacts set canonical_station_id=null where canonical_station_id is not null;
update public.radio_logs set canonical_station_id=null where canonical_station_id is not null;
update public.radio_favorites set canonical_station_id=null where canonical_station_id is not null;
update public.radio_reminders set canonical_station_id=null where canonical_station_id is not null;
update public.radio_session_attempts set canonical_station_id=null where canonical_station_id is not null;
update public.radio_dial_calibrations set canonical_station_id=null where canonical_station_id is not null;

delete from public.station_source_links;
delete from public.station_aliases;
delete from public.canonical_stations;

create or replace function public.radio_clean_station_name(value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(regexp_replace(coalesce(value,''), E'[\r\n\t]+', ' ', 'g'), '[[:space:]]+', ' ', 'g'));
$$;

create or replace function public.radio_station_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(regexp_replace(public.radio_clean_station_name(value), '[^[:alnum:]]+', '', 'g'));
$$;

with cleaned as (
  select public.radio_clean_station_name(station) as clean_name,
         public.radio_station_key(station) as station_key
  from public.guide_entries
  where entry_type='station_target' and nullif(public.radio_clean_station_name(station),'') is not null
), counted as (
  select station_key, clean_name, count(*) as n
  from cleaned
  where station_key <> ''
  group by station_key, clean_name
), ranked as (
  select station_key, clean_name, n,
         row_number() over (partition by station_key order by n desc, char_length(clean_name), clean_name) as rn
  from counted
)
insert into public.canonical_stations(canonical_name, metadata)
select clean_name, jsonb_build_object('seed','guide_entries','seed_rows',n,'normalization','whitespace_repair')
from ranked
where rn=1
on conflict (normalized_name) do nothing;

insert into public.station_aliases(canonical_station_id, alias, source, confidence, metadata)
select distinct c.id,
       public.radio_clean_station_name(g.station),
       'guide_entries',
       100,
       jsonb_build_object('seed',true,'normalization','whitespace_repair')
from public.guide_entries g
join public.canonical_stations c on c.normalized_name=public.radio_station_key(g.station)
where g.entry_type='station_target' and public.radio_station_key(g.station)<>''
on conflict (canonical_station_id, normalized_alias, source) do nothing;

update public.guide_entries g
set canonical_station_id=c.id
from public.canonical_stations c
where c.normalized_name=public.radio_station_key(g.station);

update public.station_schedules s
set canonical_station_id=public.radio_resolve_canonical_station(s.station)
where nullif(public.radio_clean_station_name(s.station),'') is not null;

update public.radio_station_contacts s
set canonical_station_id=public.radio_resolve_canonical_station(s.station_name)
where nullif(public.radio_clean_station_name(s.station_name),'') is not null;

update public.radio_logs l
set canonical_station_id=public.radio_resolve_canonical_station(coalesce(nullif(public.radio_clean_station_name(l.station),''),l.smart_station));

update public.radio_favorites f
set canonical_station_id=g.canonical_station_id
from public.guide_entries g
where f.guide_entry_id=g.id and g.canonical_station_id is not null;
update public.radio_favorites f
set canonical_station_id=public.radio_resolve_canonical_station(f.station)
where f.canonical_station_id is null;

update public.radio_reminders r
set canonical_station_id=g.canonical_station_id
from public.guide_entries g
where r.guide_entry_id=g.id and g.canonical_station_id is not null;
update public.radio_reminders r
set canonical_station_id=public.radio_resolve_canonical_station(r.station)
where r.canonical_station_id is null;

update public.radio_session_attempts a
set canonical_station_id=g.canonical_station_id
from public.guide_entries g
where a.guide_entry_id=g.id and g.canonical_station_id is not null;
update public.radio_session_attempts a
set canonical_station_id=public.radio_resolve_canonical_station(a.station)
where a.canonical_station_id is null;

update public.radio_dial_calibrations d
set canonical_station_id=public.radio_resolve_canonical_station(d.station);

insert into public.station_source_links(canonical_station_id,source,source_record_id,source_name,source_country,confidence,metadata)
select g.canonical_station_id,
       coalesce(nullif(public.radio_clean_station_name(g.source_doc),''),'guide_entries'),
       g.id::text,
       public.radio_clean_station_name(g.station),
       nullif(public.radio_clean_station_name(g.country),''),
       100,
       jsonb_strip_nulls(jsonb_build_object('season',g.season,'mode',g.mode,'band',g.band,'frequency',g.frequency,'unit',g.unit))
from public.guide_entries g
where g.canonical_station_id is not null
on conflict (source,source_record_id) where source_record_id is not null
do update set canonical_station_id=excluded.canonical_station_id,
              source_name=excluded.source_name,
              source_country=excluded.source_country,
              confidence=excluded.confidence,
              metadata=excluded.metadata,
              updated_at=now();

create trigger guide_entries_assign_canonical_station
before insert or update of station,canonical_station_id on public.guide_entries
for each row execute function public.radio_assign_catalog_canonical_station();
create trigger station_schedules_assign_canonical_station
before insert or update of station,canonical_station_id on public.station_schedules
for each row execute function public.radio_assign_catalog_canonical_station();
create trigger radio_station_contacts_assign_canonical_station
before insert or update of station_name,canonical_station_id on public.radio_station_contacts
for each row execute function public.radio_assign_catalog_canonical_station();
create trigger radio_logs_assign_canonical_station
before insert or update of station,smart_station,canonical_station_id on public.radio_logs
for each row execute function public.radio_assign_known_canonical_station();
create trigger radio_favorites_assign_canonical_station
before insert or update of station,guide_entry_id,canonical_station_id on public.radio_favorites
for each row execute function public.radio_assign_known_canonical_station();
create trigger radio_reminders_assign_canonical_station
before insert or update of station,guide_entry_id,canonical_station_id on public.radio_reminders
for each row execute function public.radio_assign_known_canonical_station();
create trigger radio_session_attempts_assign_canonical_station
before insert or update of station,guide_entry_id,canonical_station_id on public.radio_session_attempts
for each row execute function public.radio_assign_known_canonical_station();
create trigger radio_dial_calibrations_assign_canonical_station
before insert or update of station,canonical_station_id on public.radio_dial_calibrations
for each row execute function public.radio_assign_known_canonical_station();
create trigger guide_entries_sync_station_source_link
after insert or update of station,country,source_doc,season,mode,band,frequency,unit,canonical_station_id on public.guide_entries
for each row execute function public.radio_sync_guide_station_source_link();

commit;
