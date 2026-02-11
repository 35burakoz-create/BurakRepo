create table if not exists public.ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  endpoint text not null,
  request_payload jsonb,
  masked_payload text,
  response_payload jsonb,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ai_request_logs enable row level security;

create policy "ai logs member read" on public.ai_request_logs
  for select using (
    workspace_id is null
    or public.can_access_workspace(workspace_id)
  );

create policy "ai logs service insert" on public.ai_request_logs
  for insert with check (auth.role() = 'service_role');
