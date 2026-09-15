begin;

create table if not exists public.transmitter_sites (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  source_key text not null,
  season text,
  country_code text,
  country_name text,
  site_code text,
  site_name text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  confidence smallint not null default 90,
  source_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transmitter_sites_provider_key_unique unique (provider, source_key),
  constraint transmitter_sites_provider_nonempty check (btrim(provider) <> ''),
  constraint transmitter_sites_source_key_nonempty check (btrim(source_key) <> ''),
  constraint transmitter_sites_name_nonempty check (btrim(site_name) <> ''),
  constraint transmitter_sites_latitude_range check (latitude between -90 and 90),
  constraint transmitter_sites_longitude_range check (longitude between -180 and 180),
  constraint transmitter_sites_confidence_range check (confidence between 0 and 100)
);

alter table public.transmitter_sites enable row level security;
revoke all on public.transmitter_sites from anon, authenticated;
grant select on public.transmitter_sites to authenticated;
drop policy if exists transmitter_sites_authenticated_read on public.transmitter_sites;
create policy transmitter_sites_authenticated_read
  on public.transmitter_sites
  for select
  to authenticated
  using (active = true);

create index if not exists transmitter_sites_provider_active_idx
  on public.transmitter_sites(provider, active, source_key);
create index if not exists transmitter_sites_coords_idx
  on public.transmitter_sites(latitude, longitude)
  where active = true;

alter table public.station_schedules
  add column if not exists transmitter_site_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'station_schedules_transmitter_site_fkey'
      and conrelid = 'public.station_schedules'::regclass
  ) then
    alter table public.station_schedules
      add constraint station_schedules_transmitter_site_fkey
      foreign key (transmitter_site_id)
      references public.transmitter_sites(id)
      on delete set null;
  end if;
end $$;

create index if not exists station_schedules_transmitter_site_idx
  on public.station_schedules(transmitter_site_id)
  where transmitter_site_id is not null;

create or replace function public.radio_eibi_transmitter_key(p_country text, p_site_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_site_code), '') is null then null
    when left(btrim(p_site_code), 1) = '/' then nullif(substr(btrim(p_site_code), 2), '')
    when nullif(btrim(p_country), '') is null then null
    else btrim(p_country) || '-' || btrim(p_site_code)
  end
$$;

revoke all on function public.radio_eibi_transmitter_key(text,text) from public, anon, authenticated;
grant execute on function public.radio_eibi_transmitter_key(text,text) to service_role;

create or replace function public.radio_link_transmitter_sites()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleared_count integer := 0;
  hfcc_count integer := 0;
  eibi_count integer := 0;
begin
  update public.station_schedules s
     set transmitter_site_id = null
   where s.transmitter_site_id is not null
     and not exists (
       select 1 from public.transmitter_sites t
       where t.id = s.transmitter_site_id and t.active = true
     );
  get diagnostics cleared_count = row_count;

  update public.station_schedules s
     set transmitter_site_id = t.id
    from public.transmitter_sites t
   where s.source like 'HFCC %'
     and t.provider = 'HFCC'
     and t.active = true
     and nullif(btrim(s.tx_site_code), '') is not null
     and t.source_key = btrim(s.tx_site_code)
     and s.transmitter_site_id is distinct from t.id;
  get diagnostics hfcc_count = row_count;

  update public.station_schedules s
     set transmitter_site_id = t.id
    from public.transmitter_sites t
   where s.source like 'EiBi %'
     and t.provider = 'EiBi'
     and t.active = true
     and t.source_key = public.radio_eibi_transmitter_key(s.country, s.tx_site_code)
     and s.transmitter_site_id is distinct from t.id;
  get diagnostics eibi_count = row_count;

  return jsonb_build_object(
    'cleared', cleared_count,
    'hfcc_linked', hfcc_count,
    'eibi_linked', eibi_count
  );
end
$$;

revoke all on function public.radio_link_transmitter_sites() from public, anon, authenticated;
grant execute on function public.radio_link_transmitter_sites() to service_role;

create or replace function public.radio_assign_schedule_transmitter_site()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  wanted_provider text;
  wanted_key text;
begin
  if new.source like 'HFCC %' then
    wanted_provider := 'HFCC';
    wanted_key := nullif(btrim(new.tx_site_code), '');
  elsif new.source like 'EiBi %' then
    wanted_provider := 'EiBi';
    wanted_key := public.radio_eibi_transmitter_key(new.country, new.tx_site_code);
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
  where t.provider = wanted_provider
    and t.source_key = wanted_key
    and t.active = true
  limit 1;

  return new;
end
$$;

drop trigger if exists station_schedules_assign_transmitter_site on public.station_schedules;
create trigger station_schedules_assign_transmitter_site
before insert or update of source, country, tx_site_code
on public.station_schedules
for each row execute function public.radio_assign_schedule_transmitter_site();

insert into public.transmitter_sites (
  provider, source_key, season, country_name, site_code, site_name,
  latitude, longitude, confidence, source_url, active, metadata, updated_at
)
select
  'HFCC',
  btrim(s.tx_site_code),
  'A26',
  max(nullif(btrim(s.country), '')),
  btrim(s.tx_site_code),
  coalesce(max(nullif(btrim(s.tx_site_name), '')), btrim(s.tx_site_code)),
  round(avg(s.latitude)::numeric, 6),
  round(avg(s.longitude)::numeric, 6),
  98,
  'https://new.hfcc.org/data/a26/a26allx2.zip',
  true,
  jsonb_build_object(
    'source_label', 'HFCC A26',
    'schedule_rows', count(*),
    'coordinate_role', 'frequency coordination transmitter site'
  ),
  now()
from public.station_schedules s
where s.source = 'HFCC A26'
  and nullif(btrim(s.tx_site_code), '') is not null
  and s.latitude between -90 and 90
  and s.longitude between -180 and 180
group by btrim(s.tx_site_code)
having count(distinct (round(s.latitude::numeric,5), round(s.longitude::numeric,5))) = 1
on conflict (provider, source_key) do update
set season = excluded.season,
    country_name = excluded.country_name,
    site_code = excluded.site_code,
    site_name = excluded.site_name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    confidence = excluded.confidence,
    source_url = excluded.source_url,
    active = true,
    metadata = excluded.metadata,
    updated_at = now();

select public.radio_link_transmitter_sites();

commit;
