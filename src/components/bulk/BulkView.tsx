import type { CollectionCard } from "@/lib/collections";
import { getCardsByIds } from "@/lib/scryfall";
import { BulkViewClient } from "./BulkViewClient";

export async function BulkView({
  cards,
  isOwner = true,
}: {
  cards: CollectionCard[];
  isOwner?: boolean;
}) {
  if (cards.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <p className="text-ink-300">This bulk box is empty.</p>
        <p className="mt-1 text-xs text-ink-500">
          Open the Add cards panel above to start filling it.
        </p>
      </div>
    );
  }

  const ids = Array.from(new Set(cards.map((c) => c.scryfall_id)));
  let colorMap: Record<string, string[]> = {};
  try {
    const fetched = await getCardsByIds(ids);
    for (const c of fetched) {
      colorMap[c.id] = c.color_identity ?? [];
    }
  } catch {
    // Continue with empty colour data — colour grouping falls back to "Colorless".
  }

  return (
    <BulkViewClient cards={cards} colorMap={colorMap} isOwner={isOwner} />
  );
}

export function BulkViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[5/7] w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
