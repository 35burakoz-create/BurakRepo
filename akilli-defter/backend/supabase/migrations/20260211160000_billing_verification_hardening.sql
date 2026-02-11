alter table public.billing_subscriptions
  add column if not exists provider text not null default 'google_play',
  add column if not exists provider_customer_id text,
  add column if not exists entitlement_status text not null default 'inactive' check (entitlement_status in ('active','trialing','expired','canceled','inactive')),
  add column if not exists expires_at timestamptz,
  add column if not exists verification_source text not null default 'none',
  add column if not exists last_verified_at timestamptz;

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  provider text not null,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_webhook_events enable row level security;

create policy "billing webhook events service write" on public.billing_webhook_events
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
