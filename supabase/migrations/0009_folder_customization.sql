-- Folder customisation: colour + cover card image.
--
-- Same shape as collections — reuse the cover_image_url pattern so the
-- /art_crop transform applies. Colour reuses the COLLECTION_COLORS
-- palette so the existing gradient maps work for folders too.

alter table public.folders
  add column if not exists color text not null default 'arcane'
    check (color in ('arcane','ember','forest','tide','sun','shadow'));
alter table public.folders
  add column if not exists cover_scryfall_id text;
alter table public.folders
  add column if not exists cover_image_url text;

notify pgrst, 'reload schema';
