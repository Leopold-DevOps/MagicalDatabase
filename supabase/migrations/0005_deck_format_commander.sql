-- Deck format + commander slot.
-- collections.deck_format records the chosen game format (casual, standard,
-- commander, ...) so the deck board can show a card-count target and
-- enable a commander slot.
-- collection_cards.is_commander marks a single card per collection as the
-- deck's commander; uniqueness is enforced in the server action rather
-- than a partial unique index so swapping commanders stays a single
-- write.

alter table public.collections
  add column if not exists deck_format text not null default 'casual';

alter table public.collection_cards
  add column if not exists is_commander boolean not null default false;

create index if not exists collection_cards_commander_idx
  on public.collection_cards(collection_id)
  where is_commander = true;

notify pgrst, 'reload schema';
