-- Public collections + usernames.
--
-- profiles keeps public-facing user info out of auth.users so we never
-- have to expose emails to anon clients. Every authenticated user can
-- create exactly one profile row (PK = user_id).
--
-- collections.is_public flips a collection from owner-only to
-- world-readable; the RLS additions below let anon SELECT public
-- collections + their cards, while keeping writes owner-only.

-- ───── Profiles table ─────────────────────────────────────────────
create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  username text unique not null
    check (
      char_length(username) between 3 and 30
      and username ~ '^[a-z0-9_-]+$'
    ),
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx
  on public.profiles(username);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- ───── Public collections flag ────────────────────────────────────
alter table public.collections
  add column if not exists is_public boolean not null default false;

create index if not exists collections_public_idx
  on public.collections(is_public, created_at desc)
  where is_public = true;

-- Anon SELECT for public collections (existing owner SELECT policy still
-- applies in parallel for the owner's own rows).
drop policy if exists "collections_select_public" on public.collections;
create policy "collections_select_public" on public.collections
  for select using (is_public = true);

-- Anon SELECT for cards belonging to a public collection.
drop policy if exists "collection_cards_select_public" on public.collection_cards;
create policy "collection_cards_select_public" on public.collection_cards
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_cards.collection_id
        and c.is_public = true
    )
  );

notify pgrst, 'reload schema';
