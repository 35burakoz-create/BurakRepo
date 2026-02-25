-- Migration: store legal acceptance metadata in profiles
alter table public.profiles
  add column if not exists accepted_legal_at timestamptz,
  add column if not exists accepted_legal_version text;
