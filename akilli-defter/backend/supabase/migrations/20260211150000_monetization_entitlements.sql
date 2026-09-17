create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('free','personalPremium','business')),
  updated_at timestamptz not null default now()
);

alter table public.billing_subscriptions enable row level security;

create policy "billing self read" on public.billing_subscriptions
  for select using (user_id = auth.uid());

create policy "billing service write" on public.billing_subscriptions
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.ai_usage_monthly (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_name text not null,
  period_month text not null,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id, feature_name, period_month)
);

alter table public.ai_usage_monthly enable row level security;

create policy "ai usage monthly member read" on public.ai_usage_monthly
  for select using (public.can_access_workspace(workspace_id) and user_id = auth.uid());

create policy "ai usage monthly service write" on public.ai_usage_monthly
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
