-- PHASE-1 monetization primitives: pickup points + sponsorship requests + campaign FK

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

alter table public.campaigns
  add column if not exists pickup_point_id uuid references public.pickup_points(id) on delete set null;

-- keep legacy pickup_point_name for MVP compatibility; enforce at least one pickup reference for pickup mode
alter table public.campaigns drop constraint if exists campaigns_pickup_point_name_check;
alter table public.campaigns
  add constraint campaigns_pickup_point_reference_check
  check (
    delivery_mode <> 'pickup_point'
    or pickup_point_id is not null
    or pickup_point_name is not null
  );

create index if not exists idx_pickup_points_city_active_sponsored
  on public.pickup_points(city_id, is_active, sponsored_until desc);

create index if not exists idx_sponsorship_requests_city_status_created
  on public.sponsorship_requests(city_id, status, created_at desc);

alter table public.pickup_points enable row level security;
alter table public.sponsorship_requests enable row level security;

create policy "pickup_points_select_active"
on public.pickup_points
for select
to authenticated
using (is_active = true);

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
