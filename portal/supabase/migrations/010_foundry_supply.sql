-- The Foundry, phase 6: supply side and insights.
-- Partner applications (Become a partner → vetting → live) and a recruit
-- list fed from searches we couldn't answer. Service role only: no public
-- policies, the portal API does every read and write.

create table if not exists public.partner_applications (
  id               uuid default uuid_generate_v4() primary key,
  company_name     text not null,
  website          text,
  companies_house  text,
  regulator_no     text,
  category         text not null,               -- taxonomy Need key
  regions          text[] not null default '{}', -- taxonomy Region keys, or 'uk'
  clients_2y       integer,
  references_text  text,                         -- three franchise clients we can call
  insurance_path   text,                         -- object in the partner-applications bucket
  deal             text,
  contact_name     text not null,
  contact_email    text not null,
  contact_phone    text,
  contact_role     text,
  status           text not null default 'new' check (status in ('new', 'vetting', 'approved', 'declined')),
  checks           jsonb not null default '{}',  -- { ch, ins, reg, ref, call, prof: true }
  references_called integer not null default 0,
  trust_level      text not null default 'listed' check (trust_level in ('listed', 'trusted', 'recommended')),
  notes            text,
  partner_id       uuid references public.partners(id) on delete set null,
  decided_at       timestamptz,
  decided_by       uuid references public.profiles(id) on delete set null,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists partner_applications_status_idx on public.partner_applications(status, created_at desc);
create index if not exists partner_applications_email_idx on public.partner_applications(lower(contact_email));
alter table public.partner_applications enable row level security;

create table if not exists public.foundry_outreach (
  id          uuid default uuid_generate_v4() primary key,
  query       text not null,
  need        text,
  area        text,
  searches    integer not null default 0,
  status      text not null default 'todo' check (status in ('todo', 'done')),
  created_by  uuid references public.profiles(id) on delete set null,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists foundry_outreach_query_idx on public.foundry_outreach(lower(query), is_demo);
alter table public.foundry_outreach enable row level security;

-- Insurance certificates: private, read through signed URLs from admin only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-applications', 'partner-applications', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
