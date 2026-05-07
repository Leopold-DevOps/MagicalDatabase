-- Add color theming to collections.
-- Run this if your `collections` table was created before the color column existed.

alter table public.collections
  add column if not exists color text not null default 'arcane';

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

notify pgrst, 'reload schema';
