-- Migration: admin panel + audit logging

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

alter table public.reports
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by uuid references auth.users(id);

create index if not exists idx_audit_events_created_at
  on public.audit_events(created_at desc);

create index if not exists idx_audit_events_actor_user_id
  on public.audit_events(actor_user_id);

alter table public.audit_events enable row level security;
alter table public.admin_notes enable row level security;

drop policy if exists "audit_events_insert_own" on public.audit_events;
create policy "audit_events_insert_own"
on public.audit_events
for insert
to authenticated
with check (actor_user_id = auth.uid());

-- no select policy on audit_events for authenticated users
-- no admin_notes policy for authenticated users (service-role only)
