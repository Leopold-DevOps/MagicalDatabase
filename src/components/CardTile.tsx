import Image from "next/image";
import Link from "next/link";
import type { ScryfallCard } from "@/lib/scryfall";

function tileImage(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.image_uris?.large ??
    card.image_uris?.small
  );
}

export function CardTile({ card }: { card: ScryfallCard }) {
  const img = tileImage(card);
  return (
    <Link
      href={`/cards/${card.id}`}
      prefetch
      className="group block overflow-hidden rounded-xl border border-ink-800/70 bg-ink-900/40 transition duration-200 hover:-translate-y-0.5 hover:border-violet-500/50 hover:shadow-soft"
    >
      <div className="relative aspect-[5/7] w-full overflow-hidden bg-ink-950">
        {img ? (
          <Image
            src={img}
            alt={card.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 220px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center px-3 text-center text-sm text-ink-400">
            {card.name}
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium text-ink-100">
          {card.name}
        </p>
        <p className="truncate text-xs text-ink-500">
          {card.set_name ?? card.set?.toUpperCase()}
        </p>
      </div>
    </Link>
  );
}
