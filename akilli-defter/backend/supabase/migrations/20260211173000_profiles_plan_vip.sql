alter table public.profiles
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists plan text not null default 'FREE' check (plan in ('FREE','TRIAL','PRO','VIP')),
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set user_id = id
where user_id is null;

alter table public.profiles
  alter column user_id set not null;

create unique index if not exists idx_profiles_user_id_unique on public.profiles(user_id);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_plan on public.profiles(plan);

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_profiles_updated_at();
