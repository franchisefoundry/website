-- ── Web Push support ─────────────────────────────────────────
-- Stores one row per device/browser a user has enabled push on, plus a
-- per-event push preference map on profiles (separate from email prefs).

-- Per-event push toggles: { [eventKey]: boolean }. Null / missing key falls
-- back to the event's registry default (mirrors notification_prefs behaviour).
alter table public.profiles
  add column if not exists push_prefs jsonb default '{}'::jsonb;

create table if not exists public.push_subscriptions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- ── Row Level Security ────────────────────────────────────────
alter table public.push_subscriptions enable row level security;

-- Users manage only their own subscriptions. The server send path uses the
-- service-role client, which bypasses RLS.
create policy "users_select_own_push_subs" on public.push_subscriptions
  for select using (user_id = auth.uid());
create policy "users_insert_own_push_subs" on public.push_subscriptions
  for insert with check (user_id = auth.uid());
create policy "users_delete_own_push_subs" on public.push_subscriptions
  for delete using (user_id = auth.uid());
create policy "admins_all_push_subs" on public.push_subscriptions
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
