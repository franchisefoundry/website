-- ============================================================
-- Franchise Foundry Portal — Initial Schema
-- Run this in Supabase: SQL Editor → New Query → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────
-- One row per user, extends auth.users
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  role        text not null check (role in ('franchisee', 'franchisor', 'admin')),
  full_name   text,
  email       text,
  phone       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Franchisee Profiles ──────────────────────────────────────
create table public.franchisee_profiles (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references public.profiles(id) on delete cascade unique,
  investment_min       integer,
  investment_max       integer,
  preferred_locations  text[] default '{}',
  operator_model       text check (operator_model in ('owner-operator', 'hire-manager', 'either')),
  experience           text check (experience in ('none', 'management', 'food-beverage')),
  full_time_available  boolean,
  multi_site_interest  boolean default false,
  timeline_months      integer,
  sectors              text[] default '{}',
  goals                text,
  -- Access control
  status               text default 'pending_invite' check (status in ('pending_invite', 'active', 'signed', 'inactive')),
  tier_2_unlocked      boolean default false,
  -- Timestamps
  invited_at           timestamptz,
  activated_at         timestamptz,
  signed_at            timestamptz,
  assigned_admin       uuid references public.profiles(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── Franchisor Brand Profiles ────────────────────────────────
create table public.franchisor_profiles (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references public.profiles(id) on delete cascade unique,
  brand_name           text,
  slug                 text unique,
  category             text,
  teaser               text,
  investment_min       integer,
  investment_max       integer,
  investment_display   text,
  locations_available  text[] default '{}',
  locations_display    text,
  sectors              text[] default '{}',
  timeline_months      integer,
  highlights           text[] default '{}',
  operator_model       text check (operator_model in ('owner-operator', 'hire-manager', 'either')),
  format               text[] default '{}',
  experience_required  text check (experience_required in ('none', 'management', 'food-beverage')),
  multi_site_ready     boolean default false,
  full_time_required   boolean default true,
  status               text default 'draft' check (status in ('draft', 'pending_review', 'active', 'inactive')),
  admin_notes          text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── Matches ──────────────────────────────────────────────────
create table public.matches (
  id             uuid default uuid_generate_v4() primary key,
  franchisee_id  uuid references public.franchisee_profiles(id) on delete cascade,
  franchisor_id  uuid references public.franchisor_profiles(id) on delete cascade,
  score          integer check (score >= 0 and score <= 100),
  status         text default 'suggested' check (status in ('suggested', 'shown', 'interested', 'intro_made', 'declined')),
  admin_notes    text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(franchisee_id, franchisor_id)
);

-- ── Partners ──────────────────────────────────────────────────
-- FF trusted service partners (finance, property, tech, legal)
create table public.partners (
  id             uuid default uuid_generate_v4() primary key,
  name           text not null,
  slug           text unique not null,
  sector         text check (sector in ('finance', 'property', 'tech', 'legal', 'other')),
  audience       text default 'franchisee' check (audience in ('franchisee', 'franchisor', 'both')),
  tagline        text,
  description    text,
  logo_url       text,
  features       jsonb default '[]',
  is_active      boolean default true,
  display_order  integer default 0,
  created_at     timestamptz default now()
);

-- ── Intro Requests ────────────────────────────────────────────
-- "No bypass" — all partner contact goes through FF
create table public.intro_requests (
  id            uuid default uuid_generate_v4() primary key,
  requester_id  uuid references public.profiles(id) on delete cascade,
  partner_id    uuid references public.partners(id) on delete cascade,
  message       text,
  status        text default 'pending' check (status in ('pending', 'sent', 'completed')),
  admin_notes   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Invites ───────────────────────────────────────────────────
-- Tracks pending invites sent by admin
create table public.invites (
  id          uuid default uuid_generate_v4() primary key,
  email       text not null,
  role        text not null check (role in ('franchisee', 'franchisor')),
  full_name   text,
  invited_by  uuid references public.profiles(id),
  created_at  timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.franchisee_profiles enable row level security;
alter table public.franchisor_profiles enable row level security;
alter table public.matches           enable row level security;
alter table public.partners          enable row level security;
alter table public.intro_requests    enable row level security;
alter table public.invites           enable row level security;

-- Profiles
create policy "users_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "users_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "admins_all_profiles" on public.profiles
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Franchisee profiles
create policy "franchisee_select_own" on public.franchisee_profiles
  for select using (user_id = auth.uid());
create policy "franchisee_update_own" on public.franchisee_profiles
  for update using (user_id = auth.uid());
create policy "admins_all_franchisee_profiles" on public.franchisee_profiles
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Franchisor profiles
create policy "franchisor_select_own" on public.franchisor_profiles
  for select using (user_id = auth.uid());
create policy "franchisor_update_own" on public.franchisor_profiles
  for update using (user_id = auth.uid());
create policy "admins_all_franchisor_profiles" on public.franchisor_profiles
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Matches: franchisees see only 'shown' and beyond; admins see all
create policy "franchisee_select_shown_matches" on public.matches
  for select using (
    exists (
      select 1 from public.franchisee_profiles fp
      where fp.id = matches.franchisee_id and fp.user_id = auth.uid()
    )
    and status in ('shown', 'interested', 'intro_made')
  );
create policy "admins_all_matches" on public.matches
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Partners: active partners visible to all authenticated users
create policy "authed_select_active_partners" on public.partners
  for select using (auth.uid() is not null and is_active = true);
create policy "admins_all_partners" on public.partners
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Intro requests
create policy "users_select_own_intros" on public.intro_requests
  for select using (requester_id = auth.uid());
create policy "users_insert_intros" on public.intro_requests
  for insert with check (requester_id = auth.uid());
create policy "admins_all_intros" on public.intro_requests
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Invites: admin only
create policy "admins_all_invites" on public.invites
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── Trigger: auto-create profile on user signup ───────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'franchisee'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  if coalesce(new.raw_user_meta_data->>'role', 'franchisee') = 'franchisee' then
    insert into public.franchisee_profiles (user_id, status, invited_at)
    values (new.id, 'active', now());
  elsif new.raw_user_meta_data->>'role' = 'franchisor' then
    insert into public.franchisor_profiles (user_id, status)
    values (new.id, 'draft');
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Trigger: updated_at ───────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.franchisee_profiles
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.franchisor_profiles
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.matches
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.intro_requests
  for each row execute procedure public.handle_updated_at();

-- ── Make yourself admin ───────────────────────────────────────
-- After running this schema and signing up, promote your account:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
