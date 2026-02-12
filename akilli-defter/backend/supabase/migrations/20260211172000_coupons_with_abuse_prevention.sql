create table if not exists public.coupons (
  code text primary key,
  type text not null check (type in ('pro_days', 'ai_credits')),
  value int not null check (value > 0),
  expires_at timestamptz not null,
  max_redemptions int not null check (max_redemptions > 0),
  redeemed_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null references public.coupons(code) on delete cascade,
  redeemed_at timestamptz not null default now(),
  device_fingerprint_hash text not null,
  unique (user_id, code)
);

create index if not exists idx_coupon_redemptions_device_hash
  on public.coupon_redemptions(device_fingerprint_hash);

create table if not exists public.ai_extra_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.ai_extra_credits enable row level security;

drop policy if exists "coupon service role only" on public.coupons;
create policy "coupon service role only" on public.coupons
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "coupon redemptions owner read" on public.coupon_redemptions;
create policy "coupon redemptions owner read" on public.coupon_redemptions
  for select using (auth.uid() = user_id);

drop policy if exists "coupon redemptions service write" on public.coupon_redemptions;
create policy "coupon redemptions service write" on public.coupon_redemptions
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "ai extra credits owner read" on public.ai_extra_credits;
create policy "ai extra credits owner read" on public.ai_extra_credits
  for select using (auth.uid() = user_id);

drop policy if exists "ai extra credits service write" on public.ai_extra_credits;
create policy "ai extra credits service write" on public.ai_extra_credits
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
