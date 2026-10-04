-- Marketplace v1: job-based categories + partner offer/contact fields
--
-- Applied to the live project (ummpvmxkaxxninuinyzm) on 2026-08-20 via the
-- Supabase MCP as migration 20260820212318 "marketplace_v1"; this file was
-- backfilled from the recorded migration statements for reproducibility.
alter table public.partners drop constraint if exists partners_sector_check;
alter table public.partners rename column sector to category;
update public.partners set category = 'funding'    where category = 'finance';
update public.partners set category = 'technology' where category = 'tech';
alter table public.partners
  add constraint partners_category_check
  check (category in (
    'funding', 'property', 'legal', 'accounting',
    'technology', 'insurance', 'marketing', 'recruitment', 'other'
  ));
alter table public.partners add column if not exists offer_text text;
alter table public.partners add column if not exists website    text;
alter table public.partners add column if not exists location   text;
