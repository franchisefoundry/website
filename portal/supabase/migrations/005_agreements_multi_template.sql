-- Multiple agreement templates: each template is identified by template_key and
-- versioned independently (is_current marks the current version within a key).
-- Applied to the live DB via the Supabase MCP (migration agreements_multi_template).
alter table public.agreements
  add column if not exists template_key text,
  add column if not exists name text;

update public.agreements set template_key = 'master' where template_key is null;
update public.agreements set name = coalesce(nullif(title, ''), 'Master Franchise Agreement') where name is null;
