-- Two-way agreement redlining: let admins reply to a brand's agreement comment.
-- Applied to the live DB via the Supabase MCP (migration agreement_comments_admin_reply).
alter table public.agreement_comments
  add column if not exists admin_reply text,
  add column if not exists admin_reply_at timestamptz;
