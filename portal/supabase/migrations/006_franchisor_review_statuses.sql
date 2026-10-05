-- Admin questionnaire review can mark a brand as needing more info or rejected
-- (see app/api/admin/franchisors/[id]/review). The original status check only
-- allowed draft/pending_review/active/inactive, so those two decisions failed.
-- Applied to the live DB via the Supabase MCP (migration franchisor_review_statuses).
alter table public.franchisor_profiles drop constraint if exists franchisor_profiles_status_check;
alter table public.franchisor_profiles
  add constraint franchisor_profiles_status_check
  check (status in ('draft', 'pending_review', 'active', 'inactive', 'needs_info', 'rejected'));
