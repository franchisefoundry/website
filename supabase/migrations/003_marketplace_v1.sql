-- ── Marketplace v1 ────────────────────────────────────────────
-- Move partners from the 5 legacy "sectors" to a job-based category
-- taxonomy, and add fields for member offers + partner contact.
-- Safe to run once. Existing rows are remapped in place.

-- 1. Drop the old inline sector CHECK (Postgres auto-names it
--    partners_sector_check) so we can remap + rename freely.
alter table public.partners drop constraint if exists partners_sector_check;

-- 2. Rename the column: sector → category
alter table public.partners rename column sector to category;

-- 3. Remap legacy values to the new job-based taxonomy.
--    property / legal / other keep their names.
update public.partners set category = 'funding'    where category = 'finance';
update public.partners set category = 'technology' where category = 'tech';

-- 4. New CHECK constraint with the job-based taxonomy.
alter table public.partners
  add constraint partners_category_check
  check (category in (
    'funding', 'property', 'legal', 'accounting',
    'technology', 'insurance', 'marketing', 'recruitment', 'other'
  ));

-- 5. New v1 fields.
--    offer_text — the member-only "Foundry deal" line (nullable)
--    website    — partner site, opened from the detail slide-over
--    location   — e.g. "Manchester · UK-wide", shown in detail
alter table public.partners add column if not exists offer_text text;
alter table public.partners add column if not exists website    text;
alter table public.partners add column if not exists location   text;
