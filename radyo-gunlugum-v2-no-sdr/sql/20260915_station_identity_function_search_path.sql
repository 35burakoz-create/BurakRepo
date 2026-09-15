begin;

create or replace function public.radio_clean_station_name(value text)
returns text
language sql
immutable
parallel safe
set search_path=pg_catalog
as $$
  select trim(regexp_replace(regexp_replace(coalesce(value,''), E'[\r\n\t]+', ' ', 'g'), '[[:space:]]+', ' ', 'g'));
$$;

create or replace function public.radio_station_key(value text)
returns text
language sql
immutable
parallel safe
set search_path=pg_catalog
as $$
  select lower(regexp_replace(public.radio_clean_station_name(value), '[^[:alnum:]]+', '', 'g'));
$$;

revoke execute on function public.radio_clean_station_name(text) from public, anon, authenticated;
revoke execute on function public.radio_station_key(text) from public, anon, authenticated;

commit;
