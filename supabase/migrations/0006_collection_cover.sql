-- Collection cover image. The user picks a card already in the collection
-- and we record its Scryfall ID + image URL on the collection row. No
-- uploads, no new tables — the image URL is copied from collection_cards
-- (where we already cache it) and points at Scryfall.

alter table public.collections
  add column if not exists cover_scryfall_id text;
alter table public.collections
  add column if not exists cover_image_url text;

notify pgrst, 'reload schema';
