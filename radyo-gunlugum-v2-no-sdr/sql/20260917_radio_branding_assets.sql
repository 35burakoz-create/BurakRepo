create table if not exists public.branding_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_key text not null check (asset_key in ('app_icon_main','app_icon_flat','app_icon_realistic','splash_main','hero_dark_radio','hero_light_radio','share_cover_main')),
  storage_path text not null,
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  file_size bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_key)
);

alter table public.branding_assets enable row level security;
grant select, insert, update, delete on public.branding_assets to authenticated;

create policy "branding assets select own" on public.branding_assets for select to authenticated using ((select auth.uid()) = user_id);
create policy "branding assets insert own" on public.branding_assets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "branding assets update own" on public.branding_assets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "branding assets delete own" on public.branding_assets for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding-assets','branding-assets',false,8388608,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "branding storage select own" on storage.objects for select to authenticated using (bucket_id='branding-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "branding storage insert own" on storage.objects for insert to authenticated with check (bucket_id='branding-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "branding storage update own" on storage.objects for update to authenticated using (bucket_id='branding-assets' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='branding-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "branding storage delete own" on storage.objects for delete to authenticated using (bucket_id='branding-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);