-- Person-to-person messaging: admin ↔ admin, and franchisee ↔ brand once an
-- admin has revealed the match. Client ↔ Franchise Foundry team threads stay
-- on the existing `messages` table.
--
-- All access is server-mediated with the service role (same as `messages`),
-- so RLS is on with no policies: nothing is readable from the browser.

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists direct_messages_conversation_idx on public.direct_messages (conversation_id, created_at);

alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages      enable row level security;
