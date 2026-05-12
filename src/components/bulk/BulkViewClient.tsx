"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { removeCardFromCollection } from "@/app/collections/actions";
import type { CollectionCard } from "@/lib/collections";

type Mode = "box" | "grid";
type GroupBy = "set" | "color" | "alpha";

const GROUP_LABEL: Record<GroupBy, string> = {
  set: "Set",
  color: "Colour",
  alpha: "A–Z",
};

const COLOR_ORDER = [
  "White",
  "Blue",
  "Black",
  "Red",
  "Green",
  "Multicolor",
  "Colorless",
] as const;
type ColorBucket = (typeof COLOR_ORDER)[number];

const COLOR_LETTER: Record<string, Exclude<ColorBucket, "Multicolor" | "Colorless">> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

// Tiny mana pip; full strings so Tailwind keeps them.
const COLOR_PIP: Record<ColorBucket, string> = {
  White: "bg-amber-100 ring-amber-300/60",
  Blue: "bg-sky-300 ring-sky-400/60",
  Black: "bg-zinc-700 ring-zinc-500/60",
  Red: "bg-rose-400 ring-rose-500/60",
  Green: "bg-emerald-400 ring-emerald-500/60",
  Multicolor: "bg-gradient-to-br from-amber-200 via-rose-300 to-violet-400 ring-violet-300/60",
  Colorless: "bg-ink-700 ring-ink-500/60",
};

function colorBucket(identity: string[] | undefined): ColorBucket {
  if (!identity || identity.length === 0) return "Colorless";
  if (identity.length > 1) return "Multicolor";
  const letter = identity[0]?.toUpperCase();
  return COLOR_LETTER[letter] ?? "Colorless";
}

function setKey(card: CollectionCard) {
  return card.set_name ?? card.set_code?.toUpperCase() ?? "Unknown";
}

function alphaKey(card: CollectionCard) {
  const ch = card.card_name.charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Group = {
  key: string;
  label: string;
  bucket?: ColorBucket;
  cards: CollectionCard[];
};

function groupCards(
  cards: CollectionCard[],
  colorMap: Record<string, string[]>,
  by: GroupBy,
): Group[] {
  if (by === "set") {
    const m = new Map<string, CollectionCard[]>();
    for (const c of cards) {
      const k = setKey(c);
      const list = m.get(k) ?? [];
      list.push(c);
      m.set(k, list);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, list]) => ({ key: slug(label), label, cards: sortInside(list) }));
  }

  if (by === "color") {
    const m = new Map<ColorBucket, CollectionCard[]>();
    for (const c of cards) {
      const b = colorBucket(colorMap[c.scryfall_id]);
      const list = m.get(b) ?? [];
      list.push(c);
      m.set(b, list);
    }
    return COLOR_ORDER.filter((b) => m.has(b)).map((bucket) => ({
      key: slug(bucket),
      label: bucket,
      bucket,
      cards: sortInside(m.get(bucket)!),
    }));
  }

  // alpha
  const m = new Map<string, CollectionCard[]>();
  for (const c of cards) {
    const k = alphaKey(c);
    const list = m.get(k) ?? [];
    list.push(c);
    m.set(k, list);
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    })
    .map(([label, list]) => ({ key: `alpha-${slug(label)}`, label, cards: sortInside(list) }));
}

function sortInside(list: CollectionCard[]) {
  return [...list].sort((a, b) => a.card_name.localeCompare(b.card_name));
}

export function BulkViewClient({
  cards,
  colorMap,
  isOwner = true,
}: {
  cards: CollectionCard[];
  colorMap: Record<string, string[]>;
  isOwner?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("box");
  const [groupBy, setGroupBy] = useState<GroupBy>("set");

  const groups = useMemo(
    () => groupCards(cards, colorMap, groupBy),
    [cards, colorMap, groupBy],
  );

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        mode={mode}
        onMode={setMode}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        showGroupBy={mode === "box"}
      />

      {mode === "grid" ? (
        <GridView cards={cards} isOwner={isOwner} />
      ) : (
        <Box groups={groups} />
      )}
    </div>
  );
}

function Toolbar({
  mode,
  onMode,
  groupBy,
  onGroupBy,
  showGroupBy,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  showGroupBy: boolean;
}) {
  return (
    <div className="surface flex flex-wrap items-center gap-3 p-3 text-xs">
      <div className="flex items-center gap-1">
        <Tab active={mode === "box"} onClick={() => onMode("box")}>
          Box
        </Tab>
        <Tab active={mode === "grid"} onClick={() => onMode("grid")}>
          Grid
        </Tab>
      </div>

      {showGroupBy && (
        <>
          <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-500">
            Group by
          </span>
          <div className="flex items-center gap-1">
            {(Object.keys(GROUP_LABEL) as GroupBy[]).map((g) => (
              <Tab key={g} active={groupBy === g} onClick={() => onGroupBy(g)}>
                {GROUP_LABEL[g]}
              </Tab>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs transition ${
        active
          ? "border-violet-400 bg-violet-500/15 text-white"
          : "border-ink-700 text-ink-300 hover:border-violet-400/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Box({ groups }: { groups: Group[] }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Quick-jump nav */}
      <nav className="surface flex flex-wrap gap-1.5 p-3 text-[11px]">
        {groups.map((g) => (
          <a
            key={g.key}
            href={`#${g.key}`}
            className="flex items-center gap-1.5 rounded-md border border-ink-700/70 px-2 py-1 text-ink-300 transition hover:border-violet-400/60 hover:text-white"
          >
            {g.bucket && (
              <span
                className={`h-2.5 w-2.5 rounded-full ring-1 ${COLOR_PIP[g.bucket]}`}
                aria-hidden
              />
            )}
            <span>{g.label}</span>
            <span className="text-ink-500">
              {g.cards.reduce((acc, c) => acc + (c.quantity ?? 1), 0)}
            </span>
          </a>
        ))}
      </nav>

      {/* Sections */}
      {groups.map((g) => (
        <Section key={g.key} group={g} />
      ))}
    </div>
  );
}

function Section({ group }: { group: Group }) {
  const total = group.cards.reduce((acc, c) => acc + (c.quantity ?? 1), 0);
  const unique = group.cards.length;

  return (
    <section id={group.key} className="scroll-mt-20">
      {/* Divider — styled like a physical bulk-box tab */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-r-lg border-y border-r border-violet-400/30 bg-gradient-to-r from-violet-500/15 via-violet-500/5 to-transparent py-1.5 pl-3 pr-5 shadow-sm">
          {group.bucket && (
            <span
              className={`h-3 w-3 rounded-full ring-1 ${COLOR_PIP[group.bucket]}`}
              aria-hidden
            />
          )}
          <h3 className="font-display text-base text-ink-50">{group.label}</h3>
          <span className="text-[11px] text-ink-400">
            {unique} unique · {total} total
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-violet-400/30 to-transparent" />
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
        {group.cards.map((c) => (
          <li key={c.id}>
            <DenseCard card={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DenseCard({ card }: { card: CollectionCard }) {
  const img = card.image_url;
  return (
    <Link
      href={`/cards/${card.scryfall_id}`}
      prefetch={false}
      className="group relative block overflow-hidden rounded-md ring-1 ring-ink-800/70 transition hover:z-10 hover:scale-[1.06] hover:ring-violet-400/60 hover:shadow-glow"
    >
      <div className="relative aspect-[5/7] w-full bg-ink-950">
        {img ? (
          <Image
            src={img}
            alt={card.card_name}
            fill
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 14vw, 110px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center px-1.5 text-center text-[10px] text-ink-300">
            {card.card_name}
          </div>
        )}
      </div>
      {(card.quantity ?? 1) > 1 && (
        <span className="absolute right-1 top-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          ×{card.quantity}
        </span>
      )}
      {card.is_foil && (
        <span className="absolute left-1 top-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200 shadow-sm">
          Foil
        </span>
      )}
    </Link>
  );
}

function GridView({
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
