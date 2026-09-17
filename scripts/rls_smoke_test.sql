-- RLS smoke tests for Toplu Alım
-- Run in Supabase SQL editor with JWT context switched between User-A and User-B
-- Replace placeholders before execution.

-- 1) audit_events should be unreadable by mobile user (expect ERROR/0 rows)
select * from public.audit_events limit 1;

-- 2) pickup_point_entitlements should be unreadable by mobile user (expect ERROR/0 rows)
select * from public.pickup_point_entitlements limit 1;

-- 3) user can read own profile (expect 1 row)
select id, nickname from public.profiles where id = auth.uid();

-- 4) user cannot update another user's profile (expect 0 rows updated)
update public.profiles set nickname = 'hacker' where id = '00000000-0000-0000-0000-000000000000';

-- 5) user can update own profile (expect 1 row updated)
update public.profiles set nickname = nickname where id = auth.uid();

-- 6) user can insert own participant row only (expect success for own)
insert into public.participants (campaign_id, user_id, qty) values ('11111111-1111-1111-1111-111111111111', auth.uid(), 1);

-- 7) user cannot update another user's participant row (expect 0 rows)
update public.participants set qty = 99 where user_id <> auth.uid();

-- 8) non-owner cannot complete campaign (expect 0 rows)
update public.campaigns set status = 'completed' where id = '22222222-2222-2222-2222-222222222222';

-- 9) owner can complete own campaign (expect 1 row if owner)
update public.campaigns set status = 'completed' where id = '33333333-3333-3333-3333-333333333333' and created_by = auth.uid();

-- 10) anti-abuse: 4th campaign insert in 24h should fail with trigger error
-- Repeat insert 4 times as same user to verify rate limit trigger.
