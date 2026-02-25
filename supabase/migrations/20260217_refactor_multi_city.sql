-- Migration: Tire-first to multi-city-ready model

create table if not exists public.cities (
  id text primary key,
  name text not null,
  country text not null,
  timezone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cities (id, name, country, timezone, is_active)
values ('tire', 'Tire', 'TR', 'Europe/Istanbul', true)
on conflict (id) do update
set
  name = excluded.name,
  country = excluded.country,
  timezone = excluded.timezone,
  is_active = excluded.is_active;

alter table public.profiles
  add column if not exists city_id text;

update public.profiles
set city_id = 'tire'
where city_id is null;

alter table public.profiles
  alter column city_id set default 'tire',
  alter column city_id set not null;

alter table public.profiles
  drop constraint if exists profiles_city_id_fkey,
  add constraint profiles_city_id_fkey
    foreign key (city_id) references public.cities(id);

alter table public.profiles
  drop column if exists city;

alter table public.campaigns
  add column if not exists city_id text;

update public.campaigns
set city_id = 'tire'
where city_id is null;

alter table public.campaigns
  alter column city_id set default 'tire',
  alter column city_id set not null;

alter table public.campaigns
  drop constraint if exists campaigns_city_id_fkey,
  add constraint campaigns_city_id_fkey
    foreign key (city_id) references public.cities(id);

alter table public.campaigns
  drop column if exists city;

drop index if exists idx_campaigns_city_status_ends_at;
create index if not exists idx_campaigns_city_id_status_ends_at
  on public.campaigns(city_id, status, ends_at);

alter table public.cities enable row level security;

drop policy if exists "cities_select_active" on public.cities;
create policy "cities_select_active"
on public.cities
for select
to authenticated
using (is_active = true);

drop policy if exists "campaigns_select_active_completed" on public.campaigns;
drop policy if exists "campaigns_insert_owner_only" on public.campaigns;
drop policy if exists "campaigns_update_owner_only" on public.campaigns;

drop policy if exists "campaigns_select_active_completed_in_own_city" on public.campaigns;
create policy "campaigns_select_active_completed_in_own_city"
on public.campaigns
for select
to authenticated
using (
  status in ('active', 'completed')
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.city_id = campaigns.city_id
  )
);

drop policy if exists "campaigns_insert_owner_only_in_own_city" on public.campaigns;
create policy "campaigns_insert_owner_only_in_own_city"
on public.campaigns
for insert
to authenticated
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.city_id = campaigns.city_id
  )
);

drop policy if exists "campaigns_update_owner_only_in_own_city" on public.campaigns;
create policy "campaigns_update_owner_only_in_own_city"
on public.campaigns
for update
to authenticated
using (
  auth.uid() = created_by
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.city_id = campaigns.city_id
  )
)
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.city_id = campaigns.city_id
  )
);
