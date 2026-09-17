create table if not exists public.ai_rate_limits (
  key text not null,
  bucket timestamptz not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (key, bucket)
);

alter table public.ai_rate_limits enable row level security;

drop policy if exists "ai rate limits service write" on public.ai_rate_limits;
create policy "ai rate limits service write" on public.ai_rate_limits
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
