-- PHASE-2 billing entitlements for pickup point sponsorship

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

create unique index if not exists uq_pickup_point_entitlements_purchase_token
  on public.pickup_point_entitlements(purchase_token);

create index if not exists idx_pickup_point_entitlements_pickup_point_id
  on public.pickup_point_entitlements(pickup_point_id);

alter table public.pickup_point_entitlements enable row level security;

-- no client access: service-role only
