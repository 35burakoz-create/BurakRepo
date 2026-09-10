alter table public.ai_request_logs
  add column if not exists feature_name text,
  add column if not exists prompt_version text,
  add column if not exists latency_ms integer;

create table if not exists public.ai_usage_daily (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_name text not null,
  usage_date date not null,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id, feature_name, usage_date)
);

alter table public.ai_usage_daily enable row level security;

create policy "ai usage member read" on public.ai_usage_daily
  for select using (public.can_access_workspace(workspace_id) and user_id = auth.uid());

create policy "ai usage service write" on public.ai_usage_daily
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
