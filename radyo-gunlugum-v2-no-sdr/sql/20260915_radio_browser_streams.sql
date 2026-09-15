begin;

create table if not exists public.station_streams (
  id uuid primary key default gen_random_uuid(),
  canonical_station_id uuid not null references public.canonical_stations(id) on delete cascade,
  provider text not null default 'radio-browser' check (provider in ('radio-browser')),
  provider_station_id text not null check (char_length(provider_station_id) between 1 and 120),
  stream_name text not null check (char_length(stream_name) between 1 and 240),
  stream_url text null check (stream_url is null or char_length(stream_url) <= 2048),
  resolved_url text null check (resolved_url is null or char_length(resolved_url) <= 2048),
  homepage text null check (homepage is null or char_length(homepage) <= 2048),
  favicon text null check (favicon is null or char_length(favicon) <= 2048),
  country_code text null check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  country_name text null check (country_name is null or char_length(country_name) <= 160),
  language text null check (language is null or char_length(language) <= 240),
  tags text null check (tags is null or char_length(tags) <= 1200),
  codec text null check (codec is null or char_length(codec) <= 80),
  bitrate integer null check (bitrate is null or bitrate between 0 and 10000),
  is_hls boolean null,
  last_check_ok boolean null,
  provider_votes integer null check (provider_votes is null or provider_votes >= 0),
  provider_click_count integer null check (provider_click_count is null or provider_click_count >= 0),
  local_play_count integer not null default 0 check (local_play_count >= 0),
  match_confidence smallint not null check (match_confidence between 0 and 100),
  match_method text not null check (match_method in ('canonical_exact','alias_exact','name_search','manual')),
  status text not null default 'active' check (status in ('active','stale','rejected')),
  provider_payload jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz null,
  last_verified_at timestamptz null,
  last_played_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(nullif(stream_url,''),nullif(resolved_url,'')) is not null),
  unique (provider, provider_station_id)
);

create index if not exists station_streams_station_active_idx
  on public.station_streams(canonical_station_id, status, match_confidence desc, updated_at desc);
create index if not exists station_streams_provider_health_idx
  on public.station_streams(provider, last_check_ok, last_checked_at desc);

alter table public.station_streams enable row level security;
revoke all on public.station_streams from anon, authenticated;
grant select on public.station_streams to authenticated;

drop policy if exists "Authenticated users can read station streams" on public.station_streams;
create policy "Authenticated users can read station streams"
  on public.station_streams for select to authenticated using (true);

create or replace function public.radio_touch_station_stream_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.radio_touch_station_stream_updated_at() from public, anon, authenticated;

drop trigger if exists station_streams_touch_updated_at on public.station_streams;
create trigger station_streams_touch_updated_at
before update on public.station_streams
for each row execute function public.radio_touch_station_stream_updated_at();

commit;
