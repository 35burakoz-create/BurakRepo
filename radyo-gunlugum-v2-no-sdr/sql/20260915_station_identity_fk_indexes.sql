begin;

create index if not exists canonical_stations_merged_into_idx
  on public.canonical_stations(merged_into_id)
  where merged_into_id is not null;
create index if not exists radio_logs_canonical_station_idx
  on public.radio_logs(canonical_station_id)
  where canonical_station_id is not null;
create index if not exists radio_favorites_canonical_station_idx
  on public.radio_favorites(canonical_station_id)
  where canonical_station_id is not null;
create index if not exists radio_reminders_canonical_station_idx
  on public.radio_reminders(canonical_station_id)
  where canonical_station_id is not null;
create index if not exists radio_session_attempts_canonical_station_idx
  on public.radio_session_attempts(canonical_station_id)
  where canonical_station_id is not null;
create index if not exists radio_dial_calibrations_canonical_station_idx
  on public.radio_dial_calibrations(canonical_station_id)
  where canonical_station_id is not null;

commit;
