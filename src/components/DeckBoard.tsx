import Image from "next/image";
import Link from "next/link";
import { removeCardFromCollection } from "@/app/collections/actions";
import type { CollectionCard } from "@/lib/collections";
import { getCardsByIds, type ScryfallCard } from "@/lib/scryfall";

type CardType =
  | "Creature"
  | "Planeswalker"
  | "Instant"
  | "Sorcery"
  | "Artifact"
  | "Enchantment"
  | "Land"
  | "Other";

const TYPE_ORDER: CardType[] = [
  "Creature",
  "Planeswalker",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Land",
  "Other",
];

// Subtle accent for each type header — just a left-border colour cue.
const TYPE_ACCENT: Record<CardType, string> = {
  Creature: "border-l-emerald-400/60",
  Planeswalker: "border-l-fuchsia-400/60",
  Instant: "border-l-sky-400/60",
  Sorcery: "border-l-rose-400/60",
  Artifact: "border-l-zinc-300/60",
  Enchantment: "border-l-amber-300/60",
  Land: "border-l-yellow-700/70",
  Other: "border-l-ink-500/60",
};

function categorize(typeLine: string | undefined): CardType {
  if (!typeLine) return "Other";
  const tl = typeLine.toLowerCase();
  // Order matters: a "Creature — Land" should still be a Creature; check creature first.
  if (tl.includes("creature")) return "Creature";
  if (tl.includes("planeswalker")) return "Planeswalker";
  if (tl.includes("instant")) return "Instant";
  if (tl.includes("sorcery")) return "Sorcery";
  if (tl.includes("artifact")) return "Artifact";
  if (tl.includes("enchantment")) return "Enchantment";
  if (tl.includes("land")) return "Land";
  return "Other";
}

type Item = { card: CollectionCard; sf: ScryfallCard | undefined };

export async function DeckBoard({ cards }: { cards: CollectionCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <p className="text-ink-300">This deck is empty.</p>
        <p className="mt-1 text-xs text-ink-500">
          Open the Add cards panel above to start building.
        </p>
      </div>
    );
  }

  const ids = Array.from(new Set(cards.map((c) => c.scryfall_id)));
  let dataMap: Map<string, ScryfallCard> = new Map();
  try {
    const fetched = await getCardsByIds(ids);
    dataMap = new Map(fetched.map((c) => [c.id, c]));
  } catch {
    // Continue with empty map — categorization falls back to "Other".
  }

  const groups = new Map<CardType, Item[]>();
  for (const card of cards) {
    const sf = dataMap.get(card.scryfall_id);
    const type = categorize(sf?.type_line);
    const list = groups.get(type) ?? [];
    list.push({ card, sf });
    groups.set(type, list);
  }
  // Within each group: lowest CMC first, then alphabetical.
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ca = a.sf?.cmc ?? 0;
      const cb = b.sf?.cmc ?? 0;
      if (ca !== cb) return ca - cb;
      return a.card.card_name.localeCompare(b.card.card_name);
    });
  }

  // Summary bar stats
  const total = cards.reduce((acc, c) => acc + (c.quantity ?? 1), 0);
  const lands = (groups.get("Land") ?? []).reduce(
    (acc, x) => acc + (x.card.quantity ?? 1),
    0,
  );
  const nonLands = total - lands;
  let cmcSum = 0;
  let cmcCount = 0;
  for (const card of cards) {
    const sf = dataMap.get(card.scryfall_id);
    const tl = sf?.type_line?.toLowerCase() ?? "";
    if (tl.includes("land")) continue;
    const qty = card.quantity ?? 1;
    cmcSum += (sf?.cmc ?? 0) * qty;
    cmcCount += qty;
  }
  const avgCmc = cmcCount > 0 ? (cmcSum / cmcCount).toFixed(2) : "—";

  const activeGroups = TYPE_ORDER.filter((t) => groups.has(t));

  return (
    <div className="flex flex-col gap-4">
      <SummaryBar
        total={total}
        nonLands={nonLands}
        lands={lands}
        avgCmc={avgCmc}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {activeGroups.map((type) => {
          const items = groups.get(type)!;
          const count = items.reduce(
            (acc, x) => acc + (x.card.quantity ?? 1),
            0,
          );
          return (
            <Column
              key={type}
              type={type}
              count={count}
              items={items}
            />
          );
        })}
      </div>
    </div>
  );
}

function SummaryBar({
  total,
  nonLands,
  lands,
  avgCmc,
}: {
  total: number;
  nonLands: number;
  lands: number;
  avgCmc: string;
}) {
  return (
    <div className="surface flex flex-wrap items-center gap-x-8 gap-y-2 p-4 text-sm">
      <Stat label="Total" value={total} />
      <Stat label="Non-lands" value={nonLands} />
      <Stat label="Lands" value={lands} />
      <Stat label="Avg CMC" value={avgCmc} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-ink-500">
        {label}
      </span>
      <span className="text-base font-semibold text-ink-50 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function Column({
  type,
  count,
  items,
}: {
  type: CardType;
  count: number;
  items: Item[];
}) {
  return (
    <div className="flex flex-col">
      <p
        className={`mb-2 border-l-2 pl-2 text-xs font-medium uppercase tracking-wider text-ink-200 ${TYPE_ACCENT[type]}`}
      >
        {type}
        <span className="ml-1.5 font-normal text-ink-500">({count})</span>
      </p>
      <Stack items={items} />
    </div>
  );
}

function Stack({ items }: { items: Item[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <StackedCard
          key={item.card.id}
          item={item}
          isFirst={i === 0}
          isLast={i === items.length - 1}
        />
      ))}
    </div>
  );
}

function StackedCard({
  item,
  isFirst,
  isLast,
}: {
  item: Item;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { card } = item;
  const img = card.image_url;

  // -109% margin-top hides ~78% of card height (height = 140% of width with
  // aspect-[5/7]; 1.09 / 1.4 ≈ 0.78), leaving the title bar visible.
  // The last card shows fully so the user can see the bottom card art.
  const offset = isFirst ? "0" : "-109%";

  return (
    <div
      className="group relative transition-transform duration-200 hover:z-20 hover:-translate-y-1"
      style={{ marginTop: offset }}
    >
      <Link
        href={`/cards/${card.scryfall_id}`}
        className="block"
        prefetch={false}
      >
        <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md ring-1 ring-ink-800/70 transition group-hover:ring-violet-400/60 group-hover:shadow-glow">
          {img ? (
            <Image
              src={img}
              alt={card.card_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center bg-ink-900 px-2 text-center text-xs text-ink-300">
              {card.card_name}
            </div>
          )}
          {(card.quantity ?? 1) > 1 && (
            <span className="absolute right-1 top-1 z-[5] rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              ×{card.quantity}
            </span>
          )}
          {card.is_foil && (
            <span className="absolute left-1 top-1 z-[5] rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200 shadow-sm">
              Foil
            </span>
          )}
        </div>
      </Link>

      {/* Remove button — appears on hover for the bottom card so we don't
          obscure the visible name strip of stacked cards above. */}
      {isLast && (
        <form
          action={removeCardFromCollection}
          className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex justify-center opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
        >
          <input type="hidden" name="id" value={card.id} />
          <input
            type="hidden"
            name="collection_id"
            value={card.collection_id}
          />
          <button
            type="submit"
            className="rounded-md border border-rose-400/40 bg-ink-950/85 px-2 py-0.5 text-[10px] font-medium text-rose-300 backdrop-blur-sm transition hover:bg-rose-500/20"
          >
            Remove
          </button>
        </form>
      )}
    </div>
  );
}

export function DeckBoardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-14 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-64 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
