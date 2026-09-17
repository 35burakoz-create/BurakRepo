-- Radyo Günlüğüm: kişisel görsel varyasyonları ve güvenli Storage alanı.
-- Telefon/PWA simgesi paket içindeki icon.svg / apple-touch-icon.png olarak sabit kalır;
-- bu tablo uygulama içi özel görselleri kullanıcı hesabına göre saklar.

create table if not exists public.radio_branding_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_key text not null check (asset_key in (
    'app_icon','icon_flat','icon_realistic','splash','radio_dark','radio_light','share_cover'
  )),
  storage_path text not null,
  mime_type text not null,
  width integer,
  height integer,
  file_size bigint not null default 0 check (file_size >= 0 and file_size <= 10485760),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_key),
  check (width is null or width > 0),
  check (height is null or height > 0)
);

alter table public.radio_branding_assets enable row level security;

grant select, insert, update, delete on public.radio_branding_assets to authenticated;
revoke all on public.radio_branding_assets from anon;

drop policy if exists radio_branding_assets_select_own on public.radio_branding_assets;
create policy radio_branding_assets_select_own
on public.radio_branding_assets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists radio_branding_assets_insert_own on public.radio_branding_assets;
create policy radio_branding_assets_insert_own
on public.radio_branding_assets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists radio_branding_assets_update_own on public.radio_branding_assets;
create policy radio_branding_assets_update_own
on public.radio_branding_assets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists radio_branding_assets_delete_own on public.radio_branding_assets;
create policy radio_branding_assets_delete_own
on public.radio_branding_assets
for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'radio-branding',
  'radio-branding',
  false,
  10485760,
  array['image/png','image/jpeg','image/webp','image/svg+xml']::text[]
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

-- Her kullanıcı yalnız kendi UUID klasörünün altına yazabilir ve okuyabilir.
drop policy if exists radio_branding_storage_select_own on storage.objects;
create policy radio_branding_storage_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id='radio-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists radio_branding_storage_insert_own on storage.objects;
create policy radio_branding_storage_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id='radio-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists radio_branding_storage_update_own on storage.objects;
create policy radio_branding_storage_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id='radio-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id='radio-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists radio_branding_storage_delete_own on storage.objects;
create policy radio_branding_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id='radio-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
