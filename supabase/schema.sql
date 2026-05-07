-- Magical Database — initial schema
-- Run this once in the Supabase SQL editor.

-- enum for the kind of collection
do $$
begin
  if not exists (select 1 from pg_type where typname = 'collection_type') then
    create type public.collection_type as enum ('binder', 'bulk', 'deck');
  end if;
end$$;

-- collections owned by a user
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type public.collection_type not null,
  description text,
  color text not null default 'arcane'
    check (color in ('arcane','ember','forest','tide','sun','shadow')),
  binder_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists collections_user_id_idx on public.collections(user_id);

-- if upgrading from an earlier schema, ensure newer columns exist
alter table public.collections
  add column if not exists color text not null default 'arcane';
alter table public.collections
  add column if not exists binder_settings jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'collections_color_check'
  ) then
    alter table public.collections
      add constraint collections_color_check
      check (color in ('arcane','ember','forest','tide','sun','shadow'));
  end if;
end$$;

-- cards inside a collection — references Scryfall by id
create table if not exists public.collection_cards (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections on delete cascade,
  scryfall_id text not null,
  card_name text not null,
  set_code text,
  set_name text,
  image_url text,
  quantity int not null default 1 check (quantity > 0),
  position int,
  added_at timestamptz not null default now()
);
alter table public.collection_cards
  add column if not exists position int;
create index if not exists collection_cards_collection_id_idx
  on public.collection_cards(collection_id);
create index if not exists collection_cards_position_idx
  on public.collection_cards(collection_id, position);

-- RLS — every row scoped to the owning user
alter table public.collections enable row level security;
alter table public.collection_cards enable row level security;

drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own" on public.collections
  for select using (auth.uid() = user_id);

drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own" on public.collections
  for insert with check (auth.uid() = user_id);

drop policy if exists "collections_update_own" on public.collections;
create policy "collections_update_own" on public.collections
  for update using (auth.uid() = user_id);

drop policy if exists "collections_delete_own" on public.collections;
create policy "collections_delete_own" on public.collections
  for delete using (auth.uid() = user_id);

drop policy if exists "collection_cards_select_own" on public.collection_cards;
create policy "collection_cards_select_own" on public.collection_cards
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_cards.collection_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "collection_cards_insert_own" on public.collection_cards;
create policy "collection_cards_insert_own" on public.collection_cards
  for insert with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_cards.collection_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "collection_cards_update_own" on public.collection_cards;
create policy "collection_cards_update_own" on public.collection_cards
  for update using (
    exists (
      select 1 from public.collections c
      where c.id = collection_cards.collection_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "collection_cards_delete_own" on public.collection_cards;
create policy "collection_cards_delete_own" on public.collection_cards
  for delete using (
    exists (
      select 1 from public.collections c
      where c.id = collection_cards.collection_id and c.user_id = auth.uid()
    )
  );
