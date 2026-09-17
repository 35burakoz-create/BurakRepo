-- Migration: add featured flag to campaigns for priority listing
alter table public.campaigns
  add column if not exists featured boolean not null default false;
