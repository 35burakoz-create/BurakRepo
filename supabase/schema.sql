-- Toplu Alım MVP schema (Tire-first, multi-city ready)

create extension if not exists pgcrypto;

-- =========================
-- Tables
-- =========================

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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  city_id text not null default 'tire' references public.cities(id),
  neighborhood text,
  cooldown_until timestamptz,
  accepted_legal_at timestamptz,
  accepted_legal_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  city_id text not null default 'tire' references public.cities(id),
  neighborhood text,
  title text not null,
  photo_url text,
  target_count integer not null check (target_count > 0),
  ends_at timestamptz not null,
  delivery_mode text not null check (delivery_mode in ('seller', 'pickup_point')),
  pickup_point_name text,
  pickup_point_id uuid,
  featured boolean not null default false,
  sponsor_name text,
  sponsor_until timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint campaigns_pickup_point_reference_check
    check (
      delivery_mode <> 'pickup_point'
      or pickup_point_id is not null
      or pickup_point_name is not null
    )
);


create table if not exists public.pickup_points (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id),
  name text not null,
  address text not null,
  phone text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  sponsored_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.campaigns drop constraint if exists campaigns_pickup_point_id_fkey;
alter table public.campaigns
  add constraint campaigns_pickup_point_id_fkey
  foreign key (pickup_point_id) references public.pickup_points(id) on delete set null;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  qty integer not null check (qty > 0),
  pledged boolean not null default true,
  will_come boolean not null default false,
  received boolean not null default false,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  handled_at timestamptz,
  handled_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  contact_phone text not null,
  type text not null check (type in ('campaign', 'pickup_point')),
  target_id uuid,
  note text,
  status text not null default 'new' check (status in ('new', 'contacted', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.pickup_point_entitlements (
  id uuid primary key default gen_random_uuid(),
  purchase_token text not null,
  pickup_point_id uuid not null references public.pickup_points(id) on delete cascade,
  product_id text not null,
  purchaser_user_id uuid references auth.users(id),
  expires_at timestamptz not null,
  state text not null default 'active',
  last_verified_at timestamptz,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (

  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id),
  actor_nickname text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  city_id text not null default 'tire' references public.cities(id),
  payload jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  note text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- =========================
-- Indexes
-- =========================

create index if not exists idx_campaigns_city_id_status_ends_at
  on public.campaigns(city_id, status, ends_at);

create index if not exists idx_participants_campaign_id
  on public.participants(campaign_id);

create index if not exists idx_pickup_points_city_active_sponsored
  on public.pickup_points(city_id, is_active, sponsored_until desc);

create index if not exists idx_sponsorship_requests_city_status_created
  on public.sponsorship_requests(city_id, status, created_at desc);

create unique index if not exists uq_pickup_point_entitlements_purchase_token
  on public.pickup_point_entitlements(purchase_token);

create index if not exists idx_pickup_point_entitlements_pickup_point_id
  on public.pickup_point_entitlements(pickup_point_id);

create index if not exists idx_audit_events_created_at
  on public.audit_events(created_at desc);

create index if not exists idx_audit_events_actor_user_id
  on public.audit_events(actor_user_id);

-- =========================
-- RLS
-- =========================

alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.pickup_points enable row level security;
alter table public.participants enable row level security;
alter table public.reports enable row level security;
alter table public.sponsorship_requests enable row level security;
alter table public.pickup_point_entitlements enable row level security;
alter table public.audit_events enable row level security;
alter table public.admin_notes enable row level security;

-- cities: authenticated users can read active cities
create policy "cities_select_active"
on public.cities
for select
to authenticated
using (is_active = true);

-- profiles: user can select/insert/update only own row
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- campaigns: authenticated can select active/completed only in own city; owner can insert/update own in own city
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

-- pickup points: authenticated users can read active points
create policy "pickup_points_select_active"
on public.pickup_points
for select
to authenticated
using (is_active = true);

-- participants: authenticated can select; can insert/update only own row
create policy "participants_select_authenticated"
on public.participants
for select
to authenticated
using (true);

create policy "participants_insert_own"
on public.participants
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "participants_update_own"
on public.participants
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- sponsorship requests: authenticated can insert/select own requests
create policy "sponsorship_requests_insert_own"
on public.sponsorship_requests
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "sponsorship_requests_select_own"
on public.sponsorship_requests
for select
to authenticated
using (auth.uid() = user_id);

-- reports: authenticated can insert; can select only own reports
create policy "reports_insert_authenticated"
on public.reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

create policy "reports_select_own"
on public.reports
for select
to authenticated
using (auth.uid() = reporter_id);

-- audit: mobile users can log own events; no read access
create policy "audit_events_insert_own"
on public.audit_events
for insert
to authenticated
with check (actor_user_id = auth.uid());

-- admin_notes: no client access (service role only)



-- =========================
-- Anti-abuse guards
-- =========================

create or replace function public.enforce_campaign_creation_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.campaigns c
  where c.created_by = new.created_by
    and c.created_at >= now() - interval '24 hours';

  if recent_count >= 3 then
    raise exception 'Kampanya oluşturma limiti aşıldı (24 saatte en fazla 3).';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaign_rate_limit on public.campaigns;
create trigger trg_campaign_rate_limit
before insert on public.campaigns
for each row
execute function public.enforce_campaign_creation_rate_limit();

create or replace function public.enforce_will_come_toggle_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  if new.will_come is distinct from old.will_come then
    select count(*) into recent_count
    from public.audit_events a
    where a.actor_user_id = new.user_id
      and a.action = 'participant_will_come'
      and a.created_at >= now() - interval '24 hours';

    if recent_count >= 20 then
      raise exception 'will_come değişiklik limiti aşıldı. Lütfen daha sonra tekrar deneyin.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_will_come_rate_limit on public.participants;
create trigger trg_will_come_rate_limit
before update on public.participants
for each row
execute function public.enforce_will_come_toggle_rate_limit();
