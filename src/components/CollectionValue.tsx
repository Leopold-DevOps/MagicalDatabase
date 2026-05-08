import type { CollectionCard } from "@/lib/collections";
import { getCardsByIds, type ScryfallCard } from "@/lib/scryfall";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export async function CollectionValue({ cards }: { cards: CollectionCard[] }) {
  if (cards.length === 0) return null;

  const ids = Array.from(new Set(cards.map((c) => c.scryfall_id)));
  let priceMap: Map<string, ScryfallCard>;
  try {
    const fetched = await getCardsByIds(ids);
    priceMap = new Map(fetched.map((c) => [c.id, c]));
  } catch {
    return (
      <p className="text-xs text-ink-500">
        Est. value: <span className="text-ink-300">unavailable</span>
      </p>
    );
  }

  let totalCents = 0;
  let missingCopies = 0;
  let pricedCopies = 0;

  for (const card of cards) {
    const ref = priceMap.get(card.scryfall_id);
    const priceStr = card.is_foil
      ? (ref?.prices?.usd_foil ?? null)
      : (ref?.prices?.usd ?? null);
    const price = priceStr ? Number(priceStr) : NaN;
    if (!Number.isFinite(price)) {
      missingCopies += card.quantity;
      continue;
    }
    totalCents += Math.round(price * 100) * card.quantity;
    pricedCopies += card.quantity;
  }

  const total = totalCents / 100;

  return (
    <p className="text-xs text-ink-300">
      Est. value:{" "}
      <span className="font-medium text-ink-50">
        {formatter.format(total)}
      </span>
      {pricedCopies === 0 ? (
        <span className="text-ink-500">
          {" "}
          · no priced cards
        </span>
      ) : missingCopies > 0 ? (
        <span className="text-ink-500">
          {" "}
          · {missingCopies} without listed price
        </span>
      ) : null}
    </p>
  );
}

export function CollectionValueSkeleton() {
  return <div className="skeleton h-3 w-32" />;
}
