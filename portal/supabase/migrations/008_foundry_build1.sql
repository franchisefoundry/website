-- ── The Foundry: Build 1 ──────────────────────────────────────
-- Marketplace foundations: richer partner profiles, private partner
-- contacts, one-off website contacts, multi-partner intro batches, the
-- intro stage pipeline + timeline, and search/funnel logging.
--
-- Additive only: no drops, no renames. Existing code that reads
-- partners.is_active or writes intro_requests.status keeps working.
-- Every new table has RLS on; public traffic only ever reaches these
-- tables through server routes using the service role.

-- 1. Partners: profile, search and trust fields ────────────────
alter table public.partners add column if not exists trust_level text not null default 'listed'
  check (trust_level in ('listed', 'trusted', 'recommended'));
alter table public.partners add column if not exists status text not null default 'live'
  check (status in ('draft', 'live', 'paused'));
update public.partners set status = case when is_active then 'live' else 'paused' end;

alter table public.partners add column if not exists our_take            text;
alter table public.partners add column if not exists services            jsonb  not null default '[]';
alter table public.partners add column if not exists faqs                jsonb  not null default '[]';
alter table public.partners add column if not exists regions             text[] not null default '{}';
alter table public.partners add column if not exists base_location       text;
alter table public.partners add column if not exists price_from          text;
alter table public.partners add column if not exists budget_min_gbp      integer;
alter table public.partners add column if not exists budget_max_gbp      integer;
alter table public.partners add column if not exists sectors             text[] not null default '{}';
alter table public.partners add column if not exists keywords            text[] not null default '{}';
alter table public.partners add column if not exists client_count        integer;
alter table public.partners add column if not exists reply_hours_typical integer; -- admin-set until partner_stats has real data
alter table public.partners add column if not exists deal_value_gbp      integer;
alter table public.partners add column if not exists deal_terms          text;
alter table public.partners add column if not exists is_demo             boolean not null default false;

-- 2. Partner contacts (who we brief) — admin only ──────────────
create table if not exists public.partner_contacts (
  id          uuid default uuid_generate_v4() primary key,
  partner_id  uuid not null references public.partners(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  role        text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists partner_contacts_partner_idx on public.partner_contacts(partner_id);

-- 3. Foundry contacts: one-off website users, no account ───────
create table if not exists public.foundry_contacts (
  id                uuid default uuid_generate_v4() primary key,
  email             text not null,
  name              text,
  phone             text,
  verified_at       timestamptz,
  marketing_opt_in  boolean not null default false,
  profile_id        uuid references public.profiles(id) on delete set null,
  lead_id           uuid references public.leads(id) on delete set null,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);
create unique index if not exists foundry_contacts_email_idx on public.foundry_contacts(lower(email));

-- 4. Search + funnel logging (feeds Search insights) ───────────
create table if not exists public.search_events (
  id            uuid default uuid_generate_v4() primary key,
  session_id    text,
  profile_id    uuid references public.profiles(id) on delete set null,
  role          text,                 -- franchisee | franchisor | introducer | admin | null (visitor)
  surface       text not null check (surface in ('website', 'portal')),
  raw_query     text not null,
  parsed        jsonb not null default '{}',
  partner_ids   uuid[] not null default '{}',
  result_count  integer not null default 0,
  unmet_needs   text[] not null default '{}',
  parser        text not null default 'rules' check (parser in ('rules', 'ai')),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists search_events_created_idx on public.search_events(created_at desc);

create table if not exists public.foundry_events (
  id          uuid default uuid_generate_v4() primary key,
  session_id  text,
  profile_id  uuid references public.profiles(id) on delete set null,
  kind        text not null check (kind in ('profile_view', 'add_to_list', 'gap_request')),
  partner_id  uuid references public.partners(id) on delete set null,
  search_id   uuid references public.search_events(id) on delete set null,
  meta        jsonb not null default '{}',
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists foundry_events_created_idx on public.foundry_events(created_at desc);

-- 5. Intro batches: one submission, many partners ──────────────
create table if not exists public.intro_batches (
  id                    uuid default uuid_generate_v4() primary key,
  requester_profile_id  uuid references public.profiles(id) on delete cascade,      -- portal members
  contact_id            uuid references public.foundry_contacts(id) on delete cascade, -- website visitors
  on_behalf_of_lead_id  uuid references public.leads(id) on delete set null,          -- agents
  source                text not null check (source in ('website', 'portal', 'agent')),
  search_id             uuid references public.search_events(id) on delete set null,
  context               jsonb not null default '{}',   -- plan chips at send: sector, area, budget, stage, brand
  call_time             text check (call_time in ('mornings', 'afternoons', 'evenings')),
  consent_at            timestamptz,
  verify_token_hash     text,
  verified_at           timestamptz,
  tracker_token_hash    text,
  is_demo               boolean not null default false,
  created_at            timestamptz not null default now(),
  check (requester_profile_id is not null or contact_id is not null)
);
create index if not exists intro_batches_requester_idx on public.intro_batches(requester_profile_id);
create index if not exists intro_batches_contact_idx   on public.intro_batches(contact_id);

-- 6. Intro requests: stage pipeline (status kept for now) ──────
alter table public.intro_requests add column if not exists batch_id     uuid references public.intro_batches(id) on delete cascade;
alter table public.intro_requests add column if not exists need         text;
alter table public.intro_requests add column if not exists stage        text not null default 'to_brief'
  check (stage in ('awaiting_verification', 'to_brief', 'briefed', 'in_contact', 'outcome', 'closed', 'withdrawn', 'expired'));
alter table public.intro_requests add column if not exists briefed_at   timestamptz;
alter table public.intro_requests add column if not exists contacted_at timestamptz;
alter table public.intro_requests add column if not exists outcome_at   timestamptz;
alter table public.intro_requests add column if not exists closed_at    timestamptz;
alter table public.intro_requests add column if not exists chased_at    timestamptz;
alter table public.intro_requests add column if not exists sla_due_at   timestamptz;
alter table public.intro_requests add column if not exists brief_email  text;
alter table public.intro_requests add column if not exists outcome      text check (outcome in ('hired', 'not_hired', 'undecided'));
alter table public.intro_requests add column if not exists rating       text check (rating in ('going_well', 'slow', 'not_fit'));
alter table public.intro_requests add column if not exists is_demo      boolean not null default false;

update public.intro_requests set
  stage = case status when 'sent' then 'briefed' when 'completed' then 'closed' else 'to_brief' end,
  need  = coalesce(need, message);

create index if not exists intro_requests_stage_idx on public.intro_requests(stage);
create index if not exists intro_requests_batch_idx on public.intro_requests(batch_id);

-- 7. Intro events: member-facing timeline + admin audit ────────
create table if not exists public.intro_events (
  id                    uuid default uuid_generate_v4() primary key,
  intro_request_id      uuid not null references public.intro_requests(id) on delete cascade,
  kind                  text not null,
  actor_id              uuid references public.profiles(id) on delete set null,
  body                  text,
  visible_to_requester  boolean not null default true,
  created_at            timestamptz not null default now()
);
create index if not exists intro_events_request_idx on public.intro_events(intro_request_id, created_at);

-- 8. RLS ───────────────────────────────────────────────────────
alter table public.partner_contacts enable row level security;
alter table public.foundry_contacts enable row level security;
alter table public.search_events    enable row level security;
alter table public.foundry_events   enable row level security;
alter table public.intro_batches    enable row level security;
alter table public.intro_events     enable row level security;

create policy "admins_all_partner_contacts" on public.partner_contacts
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins_all_foundry_contacts" on public.foundry_contacts
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins_all_search_events" on public.search_events
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins_all_foundry_events" on public.foundry_events
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins_all_intro_batches" on public.intro_batches
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins_all_intro_events" on public.intro_events
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Members read their own batches and the visible part of their timeline.
create policy "members_select_own_batches" on public.intro_batches
  for select using (requester_profile_id = auth.uid());
create policy "members_select_own_intro_events" on public.intro_events
  for select using (
    visible_to_requester and exists (
      select 1 from public.intro_requests r
      left join public.intro_batches b on b.id = r.batch_id
      where r.id = intro_events.intro_request_id
        and (r.requester_id = auth.uid() or b.requester_profile_id = auth.uid())
    )
  );
