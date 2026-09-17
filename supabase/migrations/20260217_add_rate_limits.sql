-- Anti-abuse guards for campaign creation and will_come toggle spam

create or replace function public.enforce_campaign_creation_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.campaigns c
  where c.created_by = new.created_by
    and c.created_at >= now() - interval '24 hours';

  if recent_count >= 3 then
    raise exception 'Kampanya oluşturma limiti aşıldı (24 saatte en fazla 3).';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaign_rate_limit on public.campaigns;
create trigger trg_campaign_rate_limit
before insert on public.campaigns
for each row
execute function public.enforce_campaign_creation_rate_limit();

create or replace function public.enforce_will_come_toggle_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  if new.will_come is distinct from old.will_come then
    select count(*) into recent_count
    from public.audit_events a
    where a.actor_user_id = new.user_id
      and a.action = 'participant_will_come'
      and a.created_at >= now() - interval '24 hours';

    if recent_count >= 20 then
      raise exception 'will_come değişiklik limiti aşıldı. Lütfen daha sonra tekrar deneyin.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_will_come_rate_limit on public.participants;
create trigger trg_will_come_rate_limit
before update on public.participants
for each row
execute function public.enforce_will_come_toggle_rate_limit();
