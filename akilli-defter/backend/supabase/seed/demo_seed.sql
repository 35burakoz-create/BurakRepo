-- Demo seed (run after creating a demo user in auth.users)
-- Replace the UUID below with your auth user id before running.
\set demo_user_id '00000000-0000-0000-0000-000000000001'

insert into public.profiles (id, full_name, preferred_language)
values (:'demo_user_id', 'Demo Kullanıcı', 'tr')
on conflict (id) do nothing;

with personal_ws as (
  insert into public.workspaces (name, type, owner_id)
  values ('Kişisel Cüzdanım', 'personal', :'demo_user_id')
  returning id
),
business_ws as (
  insert into public.workspaces (name, type, owner_id)
  values ('Marmara Export', 'business', :'demo_user_id')
  returning id
)
insert into public.workspace_members (workspace_id, user_id, role)
select id, :'demo_user_id', 'owner' from personal_ws
union all
select id, :'demo_user_id', 'owner' from business_ws;
