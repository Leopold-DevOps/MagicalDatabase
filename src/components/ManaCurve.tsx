import type { CollectionCard } from "@/lib/collections";
import { getCardsByIds } from "@/lib/scryfall";

const LABELS = ["0", "1", "2", "3", "4", "5", "6", "7+"];

export async function ManaCurve({ cards }: { cards: CollectionCard[] }) {
  if (cards.length === 0) return null;

  const ids = Array.from(new Set(cards.map((c) => c.scryfall_id)));
  let cmcMap: Map<string, number>;
  try {
    const fetched = await getCardsByIds(ids);
    cmcMap = new Map(fetched.map((c) => [c.id, c.cmc ?? 0]));
  } catch {
    return null;
  }

  // Bucket by CMC; clamp anything ≥7 into the last bucket.
  const counts = new Array(8).fill(0) as number[];
  for (const card of cards) {
    const cmc = cmcMap.get(card.scryfall_id) ?? 0;
    const bucket = Math.min(Math.floor(cmc), 7);
    counts[bucket] += card.quantity ?? 1;
  }

  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-ink-400">
          Mana curve
        </p>
        <p className="text-[11px] text-ink-500">{total} cards</p>
      </div>
      <div className="flex h-20 items-end gap-1">
        {counts.map((count, i) => {
          const pct = Math.round((count / max) * 100);
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-sm bg-violet-500/70 transition-all hover:bg-violet-400"
                  style={{ height: pct === 0 ? "2px" : `${pct}%` }}
                  title={`${LABELS[i]} mana: ${count} card${count !== 1 ? "s" : ""}`}
                />
              </div>
              <span className="text-[9px] text-ink-500">{LABELS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ManaCurveSkeleton() {
  return <div className="skeleton h-[7.5rem] w-full rounded-xl" />;
}
