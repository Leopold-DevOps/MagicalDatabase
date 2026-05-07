-- Binder personalization + card ordering for drag-to-reorder.

alter table public.collections
  add column if not exists binder_settings jsonb not null default '{}'::jsonb;

alter table public.collection_cards
  add column if not exists position int;

-- Backfill positions for existing rows so dragging has a stable starting order.
update public.collection_cards cc
set position = sub.rn
from (
  select
    id,
    row_number() over (partition by collection_id order by added_at) as rn
  from public.collection_cards
  where position is null
) sub
where cc.id = sub.id and cc.position is null;

create index if not exists collection_cards_position_idx
  on public.collection_cards(collection_id, position);

notify pgrst, 'reload schema';
