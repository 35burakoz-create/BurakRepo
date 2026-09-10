-- Migration: sponsored campaigns fields
alter table public.campaigns
  add column if not exists featured boolean not null default false,
  add column if not exists sponsor_name text,
  add column if not exists sponsor_until timestamptz;
