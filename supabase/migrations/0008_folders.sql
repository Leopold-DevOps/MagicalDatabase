-- Folders for organising a user's collections.
--
-- Folders are private to each user; they never appear on /browse.
-- Nesting is limited to one level — a folder may have a parent only if
-- that parent itself has no parent. The application enforces this on
-- create / update; we don't try to express it as a SQL constraint
-- because it requires a self-referencing subquery.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  parent_folder_id uuid references public.folders on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists folders_user_idx
  on public.folders(user_id, parent_folder_id);

alter table public.collections
  add column if not exists folder_id uuid
  references public.folders on delete set null;
create index if not exists collections_folder_idx
  on public.collections(user_id, folder_id);

alter table public.folders enable row level security;

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select using (auth.uid() = user_id);
drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert with check (auth.uid() = user_id);
drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update using (auth.uid() = user_id);
drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
