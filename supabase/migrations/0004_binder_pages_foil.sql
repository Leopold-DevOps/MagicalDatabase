-- Binder pages, pocket coordinates, foils.
-- Cards live in either the tray (page_index null, pocket_index null) or
-- in a specific pocket. A pocket holds exactly one physical copy, so
-- placement implies quantity = 1; cards in the tray can stack with quantity > 1.

alter table public.collection_cards
  add column if not exists page_index int,
  add column if not exists pocket_index int,
  add column if not exists is_foil boolean not null default false;

create index if not exists collection_cards_page_pocket_idx
  on public.collection_cards(collection_id, page_index, pocket_index);

create index if not exists collection_cards_tray_idx
  on public.collection_cards(collection_id, scryfall_id, is_foil)
  where page_index is null and pocket_index is null;

notify pgrst, 'reload schema';
