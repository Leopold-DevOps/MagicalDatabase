import Image from "next/image";
import Link from "next/link";
import { removeCardFromCollection } from "@/app/collections/actions";
import { CommanderToggle } from "@/components/deck/CommanderToggle";
import { DeckFormatSelector } from "@/components/deck/DeckFormatSelector";
import type { CollectionCard } from "@/lib/collections";
import {
  DECK_FORMAT_INFO,
  normalizeDeckFormat,
  type DeckFormat,
} from "@/lib/deck";
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

export async function DeckBoard({
  collectionId,
  cards,
  deckFormat,
}: {
  collectionId: string;
  cards: CollectionCard[];
  deckFormat: string | null;
}) {
  const format: DeckFormat = normalizeDeckFormat(deckFormat);
  const formatInfo = DECK_FORMAT_INFO[format];

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SummaryBar
          collectionId={collectionId}
          format={format}
          total={0}
          nonLands={0}
          lands={0}
          avgCmc="—"
        />
        <div className="surface p-10 text-center">
          <p className="text-ink-300">This deck is empty.</p>
          <p className="mt-1 text-xs text-ink-500">
            Open the Add cards panel above to start building.
          </p>
        </div>
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

  // Pull commander(s) out of the type groupings so they live in their own slot.
  const commanderItems: Item[] = [];
  const groupable: CollectionCard[] = [];
  for (const card of cards) {
    if (formatInfo.hasCommander && card.is_commander) {
      commanderItems.push({ card, sf: dataMap.get(card.scryfall_id) });
    } else {
      groupable.push(card);
    }
  }

  const groups = new Map<CardType, Item[]>();
  for (const card of groupable) {
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

  // Summary bar stats — commanders count toward the total.
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
        collectionId={collectionId}
        format={format}
        total={total}
        nonLands={nonLands}
        lands={lands}
        avgCmc={avgCmc}
      />

      {formatInfo.hasCommander && (
        <CommanderSlot
          collectionId={collectionId}
          items={commanderItems}
        />
      )}

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
              collectionId={collectionId}
              type={type}
              count={count}
              items={items}
              showCommanderToggle={formatInfo.hasCommander}
            />
          );
        })}
      </div>
    </div>
  );
}

function SummaryBar({
  collectionId,
  format,
  total,
  nonLands,
  lands,
  avgCmc,
}: {
  collectionId: string;
  format: DeckFormat;
  total: number;
  nonLands: number;
  lands: number;
  avgCmc: string;
}) {
  const limit = DECK_FORMAT_INFO[format].limit;
  const over = limit !== null && total > limit;
  return (
    <div className="surface flex flex-wrap items-center gap-x-8 gap-y-2 p-4 text-sm">
      <CountStat total={total} limit={limit} over={over} />
      <Stat label="Non-lands" value={nonLands} />
      <Stat label="Lands" value={lands} />
      <Stat label="Avg CMC" value={avgCmc} />
      <div className="ml-auto">
        <DeckFormatSelector collectionId={collectionId} current={format} />
      </div>
    </div>
  );
}

function CountStat({
  total,
  limit,
  over,
}: {
  total: number;
  limit: number | null;
  over: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-ink-500">
        Cards
      </span>
      <span
        className={`text-base font-semibold tabular-nums ${
          over ? "text-rose-400" : "text-ink-50"
        }`}
      >
        {total}
        {limit !== null && (
          <span className={over ? "text-rose-400/80" : "text-ink-500"}>
            {" / "}
            {limit}
          </span>
        )}
      </span>
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

function CommanderSlot({
  collectionId,
  items,
}: {
  collectionId: string;
  items: Item[];
}) {
  return (
    <div className="surface flex items-start gap-4 border-amber-400/30 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
      <div className="flex flex-col">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-200">
          Commander
        </p>
        <p className="mt-0.5 text-[10px] text-ink-500">
          {items.length === 0
            ? "Pick one from the deck below"
            : `${items.length} assigned`}
        </p>
      </div>
      {items.length === 0 ? (
        <div className="grid h-32 flex-1 place-items-center rounded-md border border-dashed border-amber-400/30 px-4 text-center text-xs text-amber-200/70">
          Hover any card and click <em>Set as commander</em>.
        </div>
      ) : (
        <div className="flex flex-1 flex-wrap gap-3">
          {items.map((item) => (
            <CommanderCard
              key={item.card.id}
              collectionId={collectionId}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommanderCard({
  collectionId,
  item,
}: {
  collectionId: string;
  item: Item;
}) {
  const { card } = item;
  const img = card.image_url;
  return (
    <div className="group relative w-32">
      <Link
        href={`/cards/${card.scryfall_id}`}
        className="block overflow-hidden rounded-md ring-1 ring-amber-400/40 transition group-hover:ring-amber-300 group-hover:shadow-glow"
        prefetch={false}
      >
        <div className="relative aspect-[5/7] w-full bg-ink-950">
          {img ? (
            <Image
              src={img}
              alt={card.card_name}
              fill
              sizes="128px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center px-2 text-center text-xs text-amber-200">
              {card.card_name}
            </div>
          )}
        </div>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
        <CommanderToggle
          collectionId={collectionId}
          cardId={card.id}
          isCommander={true}
        />
      </div>
    </div>
  );
}

function Column({
  collectionId,
  type,
  count,
  items,
  showCommanderToggle,
}: {
  collectionId: string;
  type: CardType;
  count: number;
  items: Item[];
  showCommanderToggle: boolean;
}) {
  return (
    <div className="flex flex-col">
      <p
        className={`mb-2 border-l-2 pl-2 text-xs font-medium uppercase tracking-wider text-ink-200 ${TYPE_ACCENT[type]}`}
      >
        {type}
        <span className="ml-1.5 font-normal text-ink-500">({count})</span>
      </p>
      <Stack
        collectionId={collectionId}
        items={items}
        showCommanderToggle={showCommanderToggle}
      />
    </div>
  );
}

function Stack({
  collectionId,
  items,
  showCommanderToggle,
}: {
  collectionId: string;
  items: Item[];
  showCommanderToggle: boolean;
}) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <StackedCard
          key={item.card.id}
          collectionId={collectionId}
          item={item}
          isFirst={i === 0}
          isLast={i === items.length - 1}
          showCommanderToggle={showCommanderToggle}
        />
      ))}
    </div>
  );
}

function StackedCard({
  collectionId,
  item,
  isFirst,
  isLast,
  showCommanderToggle,
}: {
  collectionId: string;
  item: Item;
  isFirst: boolean;
  isLast: boolean;
  showCommanderToggle: boolean;
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

      {/* Hover-action row on the bottom card so we don't obscure the
          visible name strip of cards stacked above. */}
      {isLast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex justify-center gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
          {showCommanderToggle && (
            <CommanderToggle
              collectionId={collectionId}
              cardId={card.id}
              isCommander={card.is_commander}
            />
          )}
          <form action={removeCardFromCollection}>
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
        </div>
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
