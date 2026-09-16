-- Remove station-identity mojibake produced by the old EiBi charset/field parser.
-- These byte signatures are intentionally narrow. Normal accented/Vietnamese/etc.
-- Unicode remains valid. Raw import provenance can remain in source metadata.

delete from public.station_aliases
where encode(convert_to(alias,'UTF8'),'hex') ~ '(f1a1bb|f3aebb|f3aea0)';

delete from public.canonical_stations
where encode(convert_to(canonical_name,'UTF8'),'hex') ~ '(f1a1bb|f3aebb|f3aea0)';

alter table public.canonical_stations
  drop constraint if exists canonical_stations_known_eibi_mojibake_guard,
  add constraint canonical_stations_known_eibi_mojibake_guard
  check (encode(convert_to(canonical_name,'UTF8'),'hex') !~ '(f1a1bb|f3aebb|f3aea0)') not valid;
alter table public.canonical_stations validate constraint canonical_stations_known_eibi_mojibake_guard;

alter table public.station_aliases
  drop constraint if exists station_aliases_known_eibi_mojibake_guard,
  add constraint station_aliases_known_eibi_mojibake_guard
  check (encode(convert_to(alias,'UTF8'),'hex') !~ '(f1a1bb|f3aebb|f3aea0)') not valid;
alter table public.station_aliases validate constraint station_aliases_known_eibi_mojibake_guard;

alter table public.station_schedules
  drop constraint if exists station_schedules_known_eibi_mojibake_guard,
  add constraint station_schedules_known_eibi_mojibake_guard
  check (station is null or encode(convert_to(station,'UTF8'),'hex') !~ '(f1a1bb|f3aebb|f3aea0)') not valid;
alter table public.station_schedules validate constraint station_schedules_known_eibi_mojibake_guard;

alter table public.guide_entries
  drop constraint if exists guide_entries_known_eibi_mojibake_guard,
  add constraint guide_entries_known_eibi_mojibake_guard
  check (station is null or encode(convert_to(station,'UTF8'),'hex') !~ '(f1a1bb|f3aebb|f3aea0)') not valid;
alter table public.guide_entries validate constraint guide_entries_known_eibi_mojibake_guard;
