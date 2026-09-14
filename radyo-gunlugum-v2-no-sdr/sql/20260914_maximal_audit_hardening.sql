-- Maximal audit hardening: concurrency, data integrity and redundant relation cleanup.

-- Keep one canonical same-user foreign key per relation and add covering indexes for it.
alter table public.radio_ai_analyses drop constraint if exists radio_ai_analyses_log_id_fkey;
alter table public.radio_ai_analyses drop constraint if exists radio_ai_analyses_same_user_log_fkey;

alter table public.radio_session_attempts drop constraint if exists radio_session_attempts_session_id_fkey;
alter table public.radio_session_attempts drop constraint if exists radio_session_attempts_same_user_session_fkey;

alter table public.radio_logs drop constraint if exists radio_logs_session_id_fkey;

create index if not exists radio_logs_session_user_idx
  on public.radio_logs (session_id, user_id)
  where session_id is not null;

create index if not exists radio_session_attempts_user_session_idx
  on public.radio_session_attempts (user_id, session_id);

-- The constraint-backed unique index already guarantees this identity.
drop index if exists public.radio_favorites_user_guide_unique;

-- A session must have a lifecycle state that agrees with ended_at.
alter table public.radio_listening_sessions
  drop constraint if exists radio_listening_sessions_status_ended_consistency;
alter table public.radio_listening_sessions
  add constraint radio_listening_sessions_status_ended_consistency
  check (
    (status = 'active' and ended_at is null)
    or
    (status = 'completed' and ended_at is not null)
  );

-- Close the cross-tab TOCTOU window: an attempt cannot be inserted into an ended session.
create or replace function public.radio_guard_active_session_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.radio_listening_sessions s
    where s.id = new.session_id
      and s.user_id = new.user_id
      and s.status = 'active'
      and s.ended_at is null
  ) then
    raise exception 'Dinleme oturumu artık etkin değil.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists radio_session_attempts_active_session_guard on public.radio_session_attempts;
create trigger radio_session_attempts_active_session_guard
before insert or update of session_id, user_id
on public.radio_session_attempts
for each row execute function public.radio_guard_active_session_attempt();

-- Snapshot the radio-log inputs used by an AI analysis so long-running work cannot
-- complete against a different audio file/frequency/time after another tab edits the log.
alter table public.radio_ai_analyses
  add column if not exists log_date date,
  add column if not exists log_time time without time zone,
  add column if not exists log_band text,
  add column if not exists log_frequency numeric;

update public.radio_ai_analyses a
set log_date = l.date,
    log_time = l.time,
    log_band = l.band,
    log_frequency = l.frequency,
    audio_path = l.audio_path
from public.radio_logs l
where l.id = a.log_id
  and l.user_id = a.user_id
  and (
    a.log_date is null
    or a.log_time is null
    or a.log_band is null
    or a.log_frequency is null
  );

alter table public.radio_ai_analyses
  alter column log_date set not null,
  alter column log_time set not null,
  alter column log_band set not null,
  alter column log_frequency set not null;

create or replace function public.radio_ai_capture_log_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select l.date, l.time, l.band, l.frequency, l.audio_path
    into new.log_date, new.log_time, new.log_band, new.log_frequency, new.audio_path
  from public.radio_logs l
  where l.id = new.log_id
    and l.user_id = new.user_id;

  if not found then
    raise exception 'Yapay zekâ analizi için günlük kaydı bulunamadı.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists radio_ai_capture_log_snapshot on public.radio_ai_analyses;
create trigger radio_ai_capture_log_snapshot
before insert on public.radio_ai_analyses
for each row execute function public.radio_ai_capture_log_snapshot();

create or replace function public.radio_ai_guard_snapshot_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_date_value date;
  current_time_value time without time zone;
  current_band_value text;
  current_frequency_value numeric;
  current_audio_value text;
begin
  -- Snapshot fields are immutable after insertion.
  new.log_date := old.log_date;
  new.log_time := old.log_time;
  new.log_band := old.log_band;
  new.log_frequency := old.log_frequency;
  new.audio_path := old.audio_path;
  new.log_id := old.log_id;
  new.user_id := old.user_id;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    select l.date, l.time, l.band, l.frequency, l.audio_path
      into current_date_value, current_time_value, current_band_value, current_frequency_value, current_audio_value
    from public.radio_logs l
    where l.id = old.log_id
      and l.user_id = old.user_id;

    if not found
       or current_date_value is distinct from old.log_date
       or current_time_value is distinct from old.log_time
       or current_band_value is distinct from old.log_band
       or current_frequency_value is distinct from old.log_frequency
       or current_audio_value is distinct from old.audio_path then
      raise exception 'Günlük kaydı analiz sırasında değişti; analizi yeniden başlat.' using errcode = '40001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists radio_ai_snapshot_update_guard on public.radio_ai_analyses;
create trigger radio_ai_snapshot_update_guard
before update on public.radio_ai_analyses
for each row execute function public.radio_ai_guard_snapshot_update();

create or replace function public.radio_ai_invalidate_on_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date is distinct from old.date
     or new.time is distinct from old.time
     or new.band is distinct from old.band
     or new.frequency is distinct from old.frequency
     or new.audio_path is distinct from old.audio_path then
    update public.radio_ai_analyses
       set status = 'error',
           error = 'Günlük kaydı analiz girdilerinden sonra değişti; analizi yeniden başlat.'
     where log_id = new.id
       and user_id = new.user_id
       and status in ('running', 'completed');
  end if;
  return new;
end;
$$;

drop trigger if exists radio_logs_ai_invalidate on public.radio_logs;
create trigger radio_logs_ai_invalidate
after update of date, time, band, frequency, audio_path
on public.radio_logs
for each row execute function public.radio_ai_invalidate_on_log_change();

-- Mirror TECSUN R-9012 receiver limits in persistence tables that previously relied
-- only on UI validation.
alter table public.radio_reminders
  drop constraint if exists radio_reminders_band_check,
  drop constraint if exists radio_reminders_unit_check,
  drop constraint if exists radio_reminders_receiver_frequency_range;
alter table public.radio_reminders
  add constraint radio_reminders_band_check
    check (band = any (array['FM','MW','SW1','SW2','SW3','SW4','SW5','SW6','SW7','SW8','SW9','SW10'])),
  add constraint radio_reminders_unit_check
    check ((band = 'FM' and unit = 'MHz') or (band <> 'FM' and unit = 'kHz')),
  add constraint radio_reminders_receiver_frequency_range
    check (
      (band='FM' and frequency between 76 and 108)
      or (band='MW' and frequency between 525 and 1610)
      or (band='SW1' and frequency between 3900 and 4000)
      or (band='SW2' and frequency between 4750 and 5060)
      or (band='SW3' and frequency between 5950 and 6200)
      or (band='SW4' and frequency between 7100 and 7300)
      or (band='SW5' and frequency between 9500 and 9900)
      or (band='SW6' and frequency between 11650 and 12050)
      or (band='SW7' and frequency between 13600 and 13800)
      or (band='SW8' and frequency between 15100 and 15600)
      or (band='SW9' and frequency between 17550 and 17900)
      or (band='SW10' and frequency between 21450 and 21850)
    );

alter table public.radio_dial_calibrations
  drop constraint if exists radio_dial_calibrations_band_check,
  drop constraint if exists radio_dial_calibrations_receiver_frequency_range,
  drop constraint if exists radio_dial_calibrations_unit_consistency;
alter table public.radio_dial_calibrations
  add constraint radio_dial_calibrations_band_check
    check (band = any (array['FM','MW','SW1','SW2','SW3','SW4','SW5','SW6','SW7','SW8','SW9','SW10'])),
  add constraint radio_dial_calibrations_receiver_frequency_range
    check (
      (band='FM' and actual_frequency between 76 and 108)
      or (band='MW' and actual_frequency between 525 and 1610)
      or (band='SW1' and actual_frequency between 3900 and 4000)
      or (band='SW2' and actual_frequency between 4750 and 5060)
      or (band='SW3' and actual_frequency between 5950 and 6200)
      or (band='SW4' and actual_frequency between 7100 and 7300)
      or (band='SW5' and actual_frequency between 9500 and 9900)
      or (band='SW6' and actual_frequency between 11650 and 12050)
      or (band='SW7' and actual_frequency between 13600 and 13800)
      or (band='SW8' and actual_frequency between 15100 and 15600)
      or (band='SW9' and actual_frequency between 17550 and 17900)
      or (band='SW10' and actual_frequency between 21450 and 21850)
    ),
  add constraint radio_dial_calibrations_unit_consistency
    check (
      ((band='FM') and actual_unit='MHz' and dial_unit='MHz')
      or ((band='MW') and actual_unit='kHz' and dial_unit='kHz')
      or ((band like 'SW%') and actual_unit='kHz' and dial_unit='MHz')
    );

alter table public.radio_favorites
  drop constraint if exists radio_favorites_band_check,
  drop constraint if exists radio_favorites_frequency_check,
  drop constraint if exists radio_favorites_unit_check;
alter table public.radio_favorites
  add constraint radio_favorites_band_check
    check (band is null or band = any (array['FM','MW','SW1','SW2','SW3','SW4','SW5','SW6','SW7','SW8','SW9','SW10'])),
  add constraint radio_favorites_frequency_check
    check (
      frequency is null
      or (band='FM' and frequency between 76 and 108)
      or (band='MW' and frequency between 525 and 1610)
      or (band='SW1' and frequency between 3900 and 4000)
      or (band='SW2' and frequency between 4750 and 5060)
      or (band='SW3' and frequency between 5950 and 6200)
      or (band='SW4' and frequency between 7100 and 7300)
      or (band='SW5' and frequency between 9500 and 9900)
      or (band='SW6' and frequency between 11650 and 12050)
      or (band='SW7' and frequency between 13600 and 13800)
      or (band='SW8' and frequency between 15100 and 15600)
      or (band='SW9' and frequency between 17550 and 17900)
      or (band='SW10' and frequency between 21450 and 21850)
    ),
  add constraint radio_favorites_unit_check
    check (unit is null or (band='FM' and unit='MHz') or (band is not null and band<>'FM' and unit='kHz'));
