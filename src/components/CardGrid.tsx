import Image from "next/image";
import Link from "next/link";
import { removeCardFromCollection } from "@/app/collections/actions";
import type { CollectionCard } from "@/lib/collections";

/**
 * Standard collection-card tile. Used by the binder Grid view and the
 * bulk Grid view. Owner sees a Remove form; non-owners see the qty/foil
 * chips only.
 */
export function CardGrid({
  cards,
  isOwner,
}: {
  cards: CollectionCard[];
  isOwner: boolean;
}) {
  return (
    <ul className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((item) => (
        <li key={item.id}>
          <CardEntry item={item} isOwner={isOwner} />
        </li>
      ))}
    </ul>
  );
}

function CardEntry({
  item,
  isOwner,
}: {
  item: CollectionCard;
  isOwner: boolean;
}) {
  return (
    <div className="surface group overflow-hidden transition hover:border-violet-400/40">
      <Link
        href={`/cards/${item.scryfall_id}`}
        className="block"
        prefetch={false}
      >
        <div className="relative aspect-[5/7] w-full bg-ink-950">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.card_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 220px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-ink-400">
              {item.card_name}
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium text-ink-100">
            {item.card_name}
          </p>
          <p className="truncate text-xs text-ink-500">
            {item.set_name ?? item.set_code?.toUpperCase()}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-ink-700/50 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="chip">×{item.quantity}</span>
          {item.is_foil && <span className="chip-gold">Foil</span>}
        </div>
        {isOwner && (
          <form action={removeCardFromCollection}>
            <input type="hidden" name="id" value={item.id} />
            <input
              type="hidden"
              name="collection_id"
              value={item.collection_id}
            />
            <button
              type="submit"
              className="btn-subtle text-rose-300 hover:bg-rose-400/10"
            >
              Remove
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
