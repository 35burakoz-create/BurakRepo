begin;

create or replace function public.radio_clean_station_name(value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(regexp_replace(coalesce(value,''), E'[\r\n\t]+', ' ', 'g'), E'\s+', ' ', 'g'));
$$;

create or replace function public.radio_station_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(regexp_replace(public.radio_clean_station_name(value), '[^[:alnum:]]+', '', 'g'));
$$;

create table if not exists public.canonical_stations (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null check (char_length(canonical_name) between 1 and 180),
  normalized_name text generated always as (public.radio_station_key(canonical_name)) stored,
  status text not null default 'active' check (status in ('active','merged','hidden')),
  merged_into_id uuid null references public.canonical_stations(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (normalized_name <> ''),
  check ((status = 'merged' and merged_into_id is not null) or (status <> 'merged')),
  check (merged_into_id is null or merged_into_id <> id)
);

create unique index if not exists canonical_stations_normalized_name_uidx
  on public.canonical_stations(normalized_name);
create index if not exists canonical_stations_status_idx
  on public.canonical_stations(status, canonical_name);

create table if not exists public.station_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_station_id uuid not null references public.canonical_stations(id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 180),
  normalized_alias text generated always as (public.radio_station_key(alias)) stored,
  source text not null default 'manual' check (char_length(source) between 1 and 80),
  confidence smallint not null default 100 check (confidence between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (normalized_alias <> ''),
  unique (canonical_station_id, normalized_alias, source)
);

create index if not exists station_aliases_normalized_alias_idx
  on public.station_aliases(normalized_alias);
create index if not exists station_aliases_station_idx
  on public.station_aliases(canonical_station_id, confidence desc);

create table if not exists public.station_source_links (
  id uuid primary key default gen_random_uuid(),
  canonical_station_id uuid not null references public.canonical_stations(id) on delete cascade,
  source text not null check (char_length(source) between 1 and 120),
  source_record_id text null check (source_record_id is null or char_length(source_record_id) <= 200),
  source_name text null,
  source_country text null,
  confidence smallint not null default 100 check (confidence between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists station_source_links_source_record_uidx
  on public.station_source_links(source, source_record_id)
  where source_record_id is not null;
create index if not exists station_source_links_station_idx
  on public.station_source_links(canonical_station_id, source);

alter table public.canonical_stations enable row level security;
alter table public.station_aliases enable row level security;
alter table public.station_source_links enable row level security;

revoke all on public.canonical_stations from anon, authenticated;
revoke all on public.station_aliases from anon, authenticated;
revoke all on public.station_source_links from anon, authenticated;
grant select on public.canonical_stations to authenticated;
grant select on public.station_aliases to authenticated;
grant select on public.station_source_links to authenticated;

drop policy if exists "Authenticated users can read canonical stations" on public.canonical_stations;
create policy "Authenticated users can read canonical stations"
  on public.canonical_stations for select to authenticated using (true);
drop policy if exists "Authenticated users can read station aliases" on public.station_aliases;
create policy "Authenticated users can read station aliases"
  on public.station_aliases for select to authenticated using (true);
drop policy if exists "Authenticated users can read station source links" on public.station_source_links;
create policy "Authenticated users can read station source links"
  on public.station_source_links for select to authenticated using (true);

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
select clean_name, jsonb_build_object('seed','guide_entries','seed_rows',n)
from ranked
where rn=1
on conflict (normalized_name) do nothing;

insert into public.station_aliases(canonical_station_id, alias, source, confidence, metadata)
select distinct c.id,
       public.radio_clean_station_name(g.station),
       'guide_entries',
       100,
       jsonb_build_object('seed',true)
from public.guide_entries g
join public.canonical_stations c on c.normalized_name=public.radio_station_key(g.station)
where g.entry_type='station_target' and public.radio_station_key(g.station)<>''
on conflict (canonical_station_id, normalized_alias, source) do nothing;

create or replace function public.radio_resolve_canonical_station(value text)
returns uuid
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  ids uuid[];
begin
  if public.radio_station_key(value)='' then return null; end if;
  select array_agg(distinct a.canonical_station_id)
    into ids
  from public.station_aliases a
  join public.canonical_stations c on c.id=a.canonical_station_id
  where a.normalized_alias=public.radio_station_key(value)
    and c.status='active';
  if coalesce(array_length(ids,1),0)=1 then return ids[1]; end if;
  return null;
end;
$$;

alter table public.guide_entries add column if not exists canonical_station_id uuid;
alter table public.station_schedules add column if not exists canonical_station_id uuid;
alter table public.radio_station_contacts add column if not exists canonical_station_id uuid;
alter table public.radio_logs add column if not exists canonical_station_id uuid;
alter table public.radio_favorites add column if not exists canonical_station_id uuid;
alter table public.radio_reminders add column if not exists canonical_station_id uuid;
alter table public.radio_session_attempts add column if not exists canonical_station_id uuid;
alter table public.radio_dial_calibrations add column if not exists canonical_station_id uuid;

do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('guide_entries','guide_entries_canonical_station_fkey'),
      ('station_schedules','station_schedules_canonical_station_fkey'),
      ('radio_station_contacts','radio_station_contacts_canonical_station_fkey'),
      ('radio_logs','radio_logs_canonical_station_fkey'),
      ('radio_favorites','radio_favorites_canonical_station_fkey'),
      ('radio_reminders','radio_reminders_canonical_station_fkey'),
      ('radio_session_attempts','radio_session_attempts_canonical_station_fkey'),
      ('radio_dial_calibrations','radio_dial_calibrations_canonical_station_fkey')
    ) as x(table_name,constraint_name)
  loop
    if not exists (select 1 from pg_constraint where conname=item.constraint_name) then
      execute format('alter table public.%I add constraint %I foreign key (canonical_station_id) references public.canonical_stations(id) on delete set null', item.table_name, item.constraint_name);
    end if;
  end loop;
end;
$$;

update public.guide_entries g
set canonical_station_id=c.id
from public.canonical_stations c
where g.canonical_station_id is null
  and c.normalized_name=public.radio_station_key(g.station);

update public.station_schedules s
set canonical_station_id=public.radio_resolve_canonical_station(s.station)
where s.canonical_station_id is null and nullif(public.radio_clean_station_name(s.station),'') is not null;

update public.radio_station_contacts s
set canonical_station_id=public.radio_resolve_canonical_station(s.station_name)
where s.canonical_station_id is null and nullif(public.radio_clean_station_name(s.station_name),'') is not null;

update public.radio_logs l
set canonical_station_id=public.radio_resolve_canonical_station(coalesce(nullif(public.radio_clean_station_name(l.station),''),l.smart_station))
where l.canonical_station_id is null;

update public.radio_favorites f
set canonical_station_id=coalesce(g.canonical_station_id,public.radio_resolve_canonical_station(f.station))
from public.guide_entries g
where f.canonical_station_id is null and f.guide_entry_id=g.id;
update public.radio_favorites f
set canonical_station_id=public.radio_resolve_canonical_station(f.station)
where f.canonical_station_id is null;

update public.radio_reminders r
set canonical_station_id=coalesce(g.canonical_station_id,public.radio_resolve_canonical_station(r.station))
from public.guide_entries g
where r.canonical_station_id is null and r.guide_entry_id=g.id;
update public.radio_reminders r
set canonical_station_id=public.radio_resolve_canonical_station(r.station)
where r.canonical_station_id is null;

update public.radio_session_attempts a
set canonical_station_id=coalesce(g.canonical_station_id,public.radio_resolve_canonical_station(a.station))
from public.guide_entries g
where a.canonical_station_id is null and a.guide_entry_id=g.id;
update public.radio_session_attempts a
set canonical_station_id=public.radio_resolve_canonical_station(a.station)
where a.canonical_station_id is null;

update public.radio_dial_calibrations d
set canonical_station_id=public.radio_resolve_canonical_station(d.station)
where d.canonical_station_id is null;

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

create or replace function public.radio_assign_known_canonical_station()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  raw_name text;
  guide_id uuid;
begin
  if new.canonical_station_id is not null then return new; end if;
  if (to_jsonb(new)->>'guide_entry_id') is not null then
    begin
      guide_id := (to_jsonb(new)->>'guide_entry_id')::uuid;
      select g.canonical_station_id into new.canonical_station_id from public.guide_entries g where g.id=guide_id;
    exception when invalid_text_representation then
      new.canonical_station_id := null;
    end;
    if new.canonical_station_id is not null then return new; end if;
  end if;
  raw_name := coalesce(
    nullif(public.radio_clean_station_name(to_jsonb(new)->>'station'),''),
    nullif(public.radio_clean_station_name(to_jsonb(new)->>'station_name'),''),
    nullif(public.radio_clean_station_name(to_jsonb(new)->>'smart_station'),'')
  );
  if raw_name is not null then new.canonical_station_id := public.radio_resolve_canonical_station(raw_name); end if;
  return new;
end;
$$;

create or replace function public.radio_assign_catalog_canonical_station()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  raw_name text;
  resolved uuid;
begin
  if new.canonical_station_id is not null then return new; end if;
  raw_name := coalesce(
    nullif(public.radio_clean_station_name(to_jsonb(new)->>'station'),''),
    nullif(public.radio_clean_station_name(to_jsonb(new)->>'station_name'),'')
  );
  if raw_name is null then return new; end if;
  resolved := public.radio_resolve_canonical_station(raw_name);
  if resolved is null then
    insert into public.canonical_stations(canonical_name,metadata)
    values(raw_name,jsonb_build_object('created_by','catalog_trigger'))
    on conflict (normalized_name) do update set updated_at=public.canonical_stations.updated_at
    returning id into resolved;
    insert into public.station_aliases(canonical_station_id,alias,source,confidence)
    values(resolved,raw_name,'catalog',100)
    on conflict (canonical_station_id,normalized_alias,source) do nothing;
  end if;
  new.canonical_station_id := resolved;
  return new;
end;
$$;

create or replace function public.radio_sync_guide_station_source_link()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.canonical_station_id is null then return new; end if;
  insert into public.station_source_links(canonical_station_id,source,source_record_id,source_name,source_country,confidence,metadata)
  values(
    new.canonical_station_id,
    coalesce(nullif(public.radio_clean_station_name(new.source_doc),''),'guide_entries'),
    new.id::text,
    public.radio_clean_station_name(new.station),
    nullif(public.radio_clean_station_name(new.country),''),
    100,
    jsonb_strip_nulls(jsonb_build_object('season',new.season,'mode',new.mode,'band',new.band,'frequency',new.frequency,'unit',new.unit))
  )
  on conflict (source,source_record_id) where source_record_id is not null
  do update set canonical_station_id=excluded.canonical_station_id,
                source_name=excluded.source_name,
                source_country=excluded.source_country,
                confidence=excluded.confidence,
                metadata=excluded.metadata,
                updated_at=now();
  return new;
end;
$$;

drop trigger if exists guide_entries_assign_canonical_station on public.guide_entries;
create trigger guide_entries_assign_canonical_station
before insert or update of station,canonical_station_id on public.guide_entries
for each row execute function public.radio_assign_catalog_canonical_station();

drop trigger if exists station_schedules_assign_canonical_station on public.station_schedules;
create trigger station_schedules_assign_canonical_station
before insert or update of station,canonical_station_id on public.station_schedules
for each row execute function public.radio_assign_catalog_canonical_station();

drop trigger if exists radio_station_contacts_assign_canonical_station on public.radio_station_contacts;
create trigger radio_station_contacts_assign_canonical_station
before insert or update of station_name,canonical_station_id on public.radio_station_contacts
for each row execute function public.radio_assign_catalog_canonical_station();

drop trigger if exists radio_logs_assign_canonical_station on public.radio_logs;
create trigger radio_logs_assign_canonical_station
before insert or update of station,smart_station,canonical_station_id on public.radio_logs
for each row execute function public.radio_assign_known_canonical_station();

drop trigger if exists radio_favorites_assign_canonical_station on public.radio_favorites;
create trigger radio_favorites_assign_canonical_station
before insert or update of station,guide_entry_id,canonical_station_id on public.radio_favorites
for each row execute function public.radio_assign_known_canonical_station();

drop trigger if exists radio_reminders_assign_canonical_station on public.radio_reminders;
create trigger radio_reminders_assign_canonical_station
before insert or update of station,guide_entry_id,canonical_station_id on public.radio_reminders
for each row execute function public.radio_assign_known_canonical_station();

drop trigger if exists radio_session_attempts_assign_canonical_station on public.radio_session_attempts;
create trigger radio_session_attempts_assign_canonical_station
before insert or update of station,guide_entry_id,canonical_station_id on public.radio_session_attempts
for each row execute function public.radio_assign_known_canonical_station();

drop trigger if exists radio_dial_calibrations_assign_canonical_station on public.radio_dial_calibrations;
create trigger radio_dial_calibrations_assign_canonical_station
before insert or update of station,canonical_station_id on public.radio_dial_calibrations
for each row execute function public.radio_assign_known_canonical_station();

drop trigger if exists guide_entries_sync_station_source_link on public.guide_entries;
create trigger guide_entries_sync_station_source_link
after insert or update of station,country,source_doc,season,mode,band,frequency,unit,canonical_station_id on public.guide_entries
for each row execute function public.radio_sync_guide_station_source_link();

create index if not exists guide_entries_canonical_station_idx on public.guide_entries(canonical_station_id);
create index if not exists station_schedules_canonical_station_idx on public.station_schedules(canonical_station_id);
create index if not exists radio_station_contacts_canonical_station_idx on public.radio_station_contacts(canonical_station_id);
create index if not exists radio_logs_user_canonical_station_idx on public.radio_logs(user_id,canonical_station_id,date desc,time desc);
create index if not exists radio_favorites_user_canonical_station_idx on public.radio_favorites(user_id,canonical_station_id);
create index if not exists radio_reminders_user_canonical_station_idx on public.radio_reminders(user_id,canonical_station_id);
create index if not exists radio_session_attempts_user_canonical_station_idx on public.radio_session_attempts(user_id,canonical_station_id,attempted_at desc);
create index if not exists radio_dial_calibrations_user_canonical_station_idx on public.radio_dial_calibrations(user_id,canonical_station_id,created_at desc);

revoke execute on function public.radio_assign_known_canonical_station() from public, anon, authenticated;
revoke execute on function public.radio_assign_catalog_canonical_station() from public, anon, authenticated;
revoke execute on function public.radio_sync_guide_station_source_link() from public, anon, authenticated;
revoke execute on function public.radio_resolve_canonical_station(text) from public, anon, authenticated;
revoke execute on function public.radio_clean_station_name(text) from public, anon, authenticated;
revoke execute on function public.radio_station_key(text) from public, anon, authenticated;

commit;
