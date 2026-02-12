-- Daily AI quota hardening

alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free','pro'));

create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  used_count int not null default 0,
  used_tokens int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage_daily enable row level security;

drop policy if exists "ai usage daily owner read" on public.ai_usage_daily;
create policy "ai usage daily owner read" on public.ai_usage_daily
  for select using (user_id = auth.uid());

drop policy if exists "ai usage daily service write" on public.ai_usage_daily;
create policy "ai usage daily service write" on public.ai_usage_daily
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


create or replace function public.guard_profile_plan_write()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan and auth.role() <> 'service_role' then
    raise exception 'plan can only be updated by service role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_plan_guard on public.profiles;
create trigger profiles_plan_guard
before update on public.profiles
for each row
execute function public.guard_profile_plan_write();
