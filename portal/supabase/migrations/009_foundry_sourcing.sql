-- ── The Foundry: sourcing requests ────────────────────────────
-- "Ask us to source one" becomes a real intro request with no partner yet
-- (stage 'to_source'), which admin assigns to a partner from the pipeline.
-- Additive: widens the stage check and adds two nullable columns.
--
-- Applied to the live project via the Supabase MCP on 2026-10-11 as
-- migration "foundry_sourcing".

alter table public.intro_requests drop constraint if exists intro_requests_stage_check;
alter table public.intro_requests add constraint intro_requests_stage_check
  check (stage in ('awaiting_verification', 'to_source', 'to_brief', 'briefed', 'in_contact', 'outcome', 'closed', 'withdrawn', 'expired'));

alter table public.intro_requests add column if not exists source_category text;  -- need to source, e.g. 'property'
alter table public.intro_requests add column if not exists source_area     text;  -- e.g. 'Manchester'
