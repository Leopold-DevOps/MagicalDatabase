"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  moveCard,
  updateBinderSettings,
} from "@/app/collections/actions";
import {
  BINDER_COVERS,
  BINDER_COVER_GRADIENT,
  BINDER_COVER_INK,
  BINDER_COVER_LABEL,
  BINDER_LAYOUTS,
  BINDER_LAYOUT_GRID,
  BINDER_STYLES,
  BINDER_STYLE_LABEL,
  MAX_BINDER_PAGES,
  SORT_OPTIONS,
  type BinderCover,
  type BinderLayout,
  type BinderSettings,
  type BinderStyle,
  type SortOption,
} from "@/lib/binder";
import type { CollectionCard } from "@/lib/collections";

type Props = {
  collectionId: string;
  initialCards: CollectionCard[];
  initialSettings: BinderSettings;
};

const TRAY_DROPPABLE_ID = "tray";
const pocketId = (page: number, pocket: number) => `pocket-${page}-${pocket}`;

export function BinderView({
  collectionId,
  initialCards,
  initialSettings,
}: Props) {
  const [cards, setCards] = useState<CollectionCard[]>(initialCards);
  const [settings, setSettings] = useState<BinderSettings>(initialSettings);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("added-desc");
  const [setFilter, setSetFilter] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const trayCards = useMemo(
    () =>
      cards.filter(
        (c) => c.page_index === null || c.pocket_index === null,
      ),
    [cards],
  );

  const placedByPage = useMemo(() => {
    const m = new Map<number, Map<number, CollectionCard>>();
    for (const c of cards) {
      if (c.page_index !== null && c.pocket_index !== null) {
        let inner = m.get(c.page_index);
        if (!inner) {
          inner = new Map();
          m.set(c.page_index, inner);
        }
        inner.set(c.pocket_index, c);
      }
    }
    return m;
  }, [cards]);

  const filteredTray = useMemo(() => {
    let list = trayCards;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.card_name.toLowerCase().includes(q));
    if (setFilter) list = list.filter((c) => c.set_code === setFilter);
    return [...list].sort(sortComparator(sort));
  }, [trayCards, search, setFilter, sort]);

  const sets = useMemo(() => {
    const m = new Map<string, string>();
    cards.forEach((c) => {
      if (c.set_code) m.set(c.set_code, c.set_name ?? c.set_code.toUpperCase());
    });
    return Array.from(m.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cards]);

  const totalPages = settings.pageCount;
  const safePage = Math.min(page, totalPages - 1);
  const lastPageEmpty = !placedByPage.has(totalPages - 1);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  function persistSettings(next: BinderSettings) {
    setSettings(next);
    startTransition(async () => {
      const result = await updateBinderSettings(collectionId, next);
      if ("error" in result) setSettings(initialSettings);
    });
  }

  function handleAddPage() {
    if (totalPages >= MAX_BINDER_PAGES) return;
    persistSettings({ ...settings, pageCount: totalPages + 1 });
    setPage(totalPages);
  }

  function handleRemovePage() {
    if (totalPages <= 1 || !lastPageEmpty) return;
    const next = { ...settings, pageCount: totalPages - 1 };
    persistSettings(next);
    setPage(Math.min(safePage, next.pageCount - 1));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = activeId;
    setActiveId(null);
    if (!id || !event.over) return;
    const overId = String(event.over.id);

    // Determine target
    let target: { type: "tray" } | { type: "pocket"; page: number; pocket: number };
    if (overId === TRAY_DROPPABLE_ID) {
      target = { type: "tray" };
    } else {
      const m = overId.match(/^pocket-(\d+)-(\d+)$/);
      if (!m) return;
      target = {
        type: "pocket",
        page: Number(m[1]),
        pocket: Number(m[2]),
      };
    }

    // Optimistic update
    const draggedCard = cards.find((c) => c.id === id);
    if (!draggedCard) return;

    const optimistic = applyMoveOptimistic(cards, draggedCard, target);
    setCards(optimistic);

    startTransition(async () => {
      const result = await moveCard(collectionId, id, target);
      if ("error" in result) {
        setCards(initialCards);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        sets={sets}
        setFilter={setFilter}
        onSetFilter={setSetFilter}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((s) => !s)}
      />

      {showSettings && (
        <SettingsPanel settings={settings} onChange={persistSettings} />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Tray cards={filteredTray} totalLoose={trayCards.length} />

          <div className="flex flex-col gap-3">
            <BinderPage
              cover={settings.cover}
              style={settings.style}
              layout={settings.pocketsPerPage}
              page={safePage}
              placed={placedByPage.get(safePage)}
            />

            <Pager
              page={safePage}
              totalPages={totalPages}
              onChange={setPage}
              onAddPage={handleAddPage}
              onRemovePage={lastPageEmpty ? handleRemovePage : undefined}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? <DragPreview card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function applyMoveOptimistic(
  cards: CollectionCard[],
  dragged: CollectionCard,
  target: { type: "tray" } | { type: "pocket"; page: number; pocket: number },
): CollectionCard[] {
  const fromTray =
    dragged.page_index === null || dragged.pocket_index === null;

  if (target.type === "tray") {
    if (fromTray) return cards;
    // Try to merge with existing tray stack
    const existing = cards.find(
      (c) =>
        c.id !== dragged.id &&
        c.page_index === null &&
        c.pocket_index === null &&
        c.scryfall_id === dragged.scryfall_id &&
        c.is_foil === dragged.is_foil,
    );
    if (existing) {
      return cards
        .filter((c) => c.id !== dragged.id)
        .map((c) =>
          c.id === existing.id
            ? { ...c, quantity: (c.quantity ?? 0) + (dragged.quantity ?? 1) }
            : c,
        );
    }
    return cards.map((c) =>
      c.id === dragged.id
        ? { ...c, page_index: null, pocket_index: null }
        : c,
    );
  }

  // target is a pocket
  const { page, pocket } = target;
  if (dragged.page_index === page && dragged.pocket_index === pocket) {
    return cards;
  }

  const occupant = cards.find(
    (c) =>
      c.id !== dragged.id &&
      c.page_index === page &&
      c.pocket_index === pocket,
  );

  if (!occupant) {
    if (fromTray && (dragged.quantity ?? 1) > 1) {
      // split: keep stack with qty-1, push a virtual placed copy
      const placed: CollectionCard = {
        ...dragged,
        id: `__optimistic-${dragged.id}`,
        quantity: 1,
        page_index: page,
        pocket_index: pocket,
      };
      return [
        ...cards.map((c) =>
          c.id === dragged.id
            ? { ...c, quantity: (c.quantity ?? 1) - 1 }
            : c,
        ),
        placed,
      ];
    }
    return cards.map((c) =>
      c.id === dragged.id ? { ...c, page_index: page, pocket_index: pocket } : c,
    );
  }

  if (!fromTray) {
    // swap
    const oldPage = dragged.page_index!;
    const oldPocket = dragged.pocket_index!;
    return cards.map((c) => {
      if (c.id === dragged.id)
        return { ...c, page_index: page, pocket_index: pocket };
      if (c.id === occupant.id)
        return { ...c, page_index: oldPage, pocket_index: oldPocket };
      return c;
    });
  }

  // dragged from tray onto occupied pocket → bump occupant to tray, place dragged
  let next = cards.map((c) =>
    c.id === occupant.id
      ? { ...c, page_index: null, pocket_index: null }
      : c,
  );
  if ((dragged.quantity ?? 1) > 1) {
    next = next.map((c) =>
      c.id === dragged.id ? { ...c, quantity: (c.quantity ?? 1) - 1 } : c,
    );
    next.push({
      ...dragged,
      id: `__optimistic-${dragged.id}`,
      quantity: 1,
      page_index: page,
      pocket_index: pocket,
    });
  } else {
    next = next.map((c) =>
      c.id === dragged.id
        ? { ...c, page_index: page, pocket_index: pocket }
        : c,
    );
  }
  return next;
}

function sortComparator(opt: SortOption) {
  return (a: CollectionCard, b: CollectionCard): number => {
    switch (opt) {
      case "added-desc":
        return b.added_at.localeCompare(a.added_at);
      case "added-asc":
        return a.added_at.localeCompare(b.added_at);
      case "name-asc":
        return a.card_name.localeCompare(b.card_name);
      case "name-desc":
        return b.card_name.localeCompare(a.card_name);
      case "set-asc":
        return (a.set_name ?? "").localeCompare(b.set_name ?? "");
      case "qty-desc":
        return (b.quantity ?? 0) - (a.quantity ?? 0);
      case "qty-asc":
        return (a.quantity ?? 0) - (b.quantity ?? 0);
    }
  };
}

function Toolbar({
  search,
  onSearch,
  sort,
  onSort,
  sets,
  setFilter,
  onSetFilter,
  showSettings,
  onToggleSettings,
}: {
  search: string;
  onSearch: (v: string) => void;
  sort: SortOption;
  onSort: (v: SortOption) => void;
  sets: { code: string; name: string }[];
  setFilter: string | null;
  onSetFilter: (v: string | null) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}) {
  return (
    <div className="surface flex flex-wrap items-center gap-2 p-3">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search loose cards…"
        className="input-field flex-1 min-w-[180px]"
        aria-label="Search loose cards"
      />
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortOption)}
        className="input-field w-auto"
        aria-label="Sort"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {sets.length > 0 && (
        <select
          value={setFilter ?? ""}
          onChange={(e) => onSetFilter(e.target.value || null)}
          className="input-field w-auto"
          aria-label="Filter by set"
        >
          <option value="">All sets</option>
          {sets.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={onToggleSettings}
        className={`btn-ghost ${showSettings ? "border-violet-400/50 text-white" : ""}`}
        aria-expanded={showSettings}
      >
        ⚙ Binder
      </button>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: BinderSettings;
  onChange: (s: BinderSettings) => void;
}) {
  return (
    <div className="surface flex flex-col gap-4 p-4 animate-fade-in-up">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">
          Pockets per page
        </p>
        <div className="flex flex-wrap gap-2">
          {BINDER_LAYOUTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...settings, pocketsPerPage: n })}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                settings.pocketsPerPage === n
                  ? "border-violet-400 bg-violet-500/15 text-white"
                  : "border-ink-700 text-ink-300 hover:border-violet-400/50 hover:text-white"
              }`}
            >
              {n} pockets
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">
          Style
        </p>
        <div className="flex flex-wrap gap-2">
          {BINDER_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...settings, style: s })}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                settings.style === s
                  ? "border-violet-400 bg-violet-500/15 text-white"
                  : "border-ink-700 text-ink-300 hover:border-violet-400/50 hover:text-white"
              }`}
            >
              {BINDER_STYLE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">
          Cover
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {BINDER_COVERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...settings, cover: c })}
              className={`rounded-md border p-1.5 transition ${
                settings.cover === c
                  ? "border-violet-400 shadow-glow"
                  : "border-ink-700 hover:border-violet-400/50"
              }`}
              aria-label={`Cover ${BINDER_COVER_LABEL[c]}`}
            >
              <div
                className={`h-8 w-full rounded ${BINDER_COVER_GRADIENT[c]}`}
              />
              <p className="mt-1 text-center text-[10px] text-ink-300">
                {BINDER_COVER_LABEL[c]}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tray({
  cards,
  totalLoose,
}: {
  cards: CollectionCard[];
  totalLoose: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY_DROPPABLE_ID });
  return (
    <div
      ref={setNodeRef}
      className={`surface flex max-h-[640px] flex-col overflow-hidden p-3 transition lg:max-h-none lg:min-h-[400px] ${
        isOver ? "border-violet-400/60 ring-2 ring-violet-400/40" : ""
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-ink-300">
          Loose cards
        </p>
        <span className="text-[11px] text-ink-500">{totalLoose}</span>
      </div>
      {cards.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-md border border-dashed border-ink-700/60 px-3 py-10 text-center text-xs text-ink-500">
          {totalLoose === 0
            ? "No loose cards. Drop a card here to take it out of the binder."
            : "No matches in your search."}
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
          {cards.map((c) => (
            <li key={c.id}>
              <DraggableCard card={c} size="tray" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BinderPage({
  cover,
  style,
  layout,
  page,
  placed,
}: {
  cover: BinderCover;
  style: BinderStyle;
  layout: BinderLayout;
  page: number;
  placed: Map<number, CollectionCard> | undefined;
}) {
  const grid = BINDER_LAYOUT_GRID[layout];
  return (
    <div
      className={`relative mx-auto w-full max-w-md overflow-hidden rounded-2xl ${BINDER_COVER_GRADIENT[cover]} p-3 shadow-glow animate-fade-in-up sm:max-w-lg`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:18px_18px]" />

      <div className="relative flex gap-3">
        {style === "ring" && (
          <div
            className="hidden flex-col items-center justify-evenly py-3 sm:flex"
            aria-hidden
          >
            {Array.from({ length: layout >= 9 ? 4 : 3 }).map((_, i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-black/45 ring-1 ring-white/20"
              />
            ))}
          </div>
        )}

        <div className="relative flex-1 rounded-xl bg-ink-950/40 p-2 backdrop-blur-sm">
          <div className={`grid gap-2 ${grid}`}>
            {Array.from({ length: layout }).map((_, i) => (
              <Pocket
                key={i}
                page={page}
                pocket={i}
                card={placed?.get(i) ?? null}
              />
            ))}
          </div>
        </div>
      </div>

      <p
        className={`mt-2 text-right text-[10px] ${BINDER_COVER_INK[cover]} opacity-80`}
      >
        {BINDER_COVER_LABEL[cover]} ·{" "}
        {style === "ring" ? "Ring binder" : "Portfolio"}
      </p>
    </div>
  );
}

function Pocket({
  page,
  pocket,
  card,
}: {
  page: number;
  pocket: number;
  card: CollectionCard | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pocketId(page, pocket) });
  return (
    <div
      ref={setNodeRef}
      className={`relative aspect-[5/7] rounded-md transition ${
        isOver
          ? "ring-2 ring-violet-300/80 bg-violet-400/10"
          : card
            ? "ring-1 ring-white/10 bg-black/30"
            : "border border-dashed border-white/15 bg-black/20"
      }`}
    >
      {card ? <DraggableCard card={card} size="pocket" /> : null}
    </div>
  );
}

function DraggableCard({
  card,
  size,
}: {
  card: CollectionCard;
  size: "pocket" | "tray";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  const inPocket = size === "pocket";
  const showFoil = card.is_foil;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group relative h-full w-full cursor-grab overflow-hidden rounded-md transition active:cursor-grabbing ${
        inPocket
          ? "shadow-md hover:scale-[1.04] hover:ring-2 hover:ring-violet-300/60 hover:shadow-glow"
          : "aspect-[5/7] hover:scale-[1.04] hover:ring-2 hover:ring-violet-300/60"
      } ${isDragging ? "opacity-30" : ""} ${showFoil ? "foil-card" : ""}`}
    >
      <Link
        href={`/cards/${card.scryfall_id}`}
        className="block h-full w-full"
        onClick={(e) => isDragging && e.preventDefault()}
        draggable={false}
      >
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.card_name}
            fill
            sizes={
              inPocket
                ? "(max-width: 640px) 30vw, 140px"
                : "(max-width: 640px) 30vw, 110px"
            }
            className="object-cover"
            draggable={false}
          />
        ) : (
          <div className="grid h-full place-items-center px-1.5 text-center text-[10px] text-white/80">
            {card.card_name}
          </div>
        )}
      </Link>
      {/* Sleeve gloss */}
      <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      {!inPocket && card.quantity > 1 && (
        <span className="absolute right-1 top-1 z-[5] rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          ×{card.quantity}
        </span>
      )}
      {showFoil && (
        <span className="absolute left-1 top-1 z-[5] rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200 shadow-sm">
          Foil
        </span>
      )}
    </div>
  );
}

function DragPreview({ card }: { card: CollectionCard }) {
  return (
    <div
      className={`relative aspect-[5/7] w-[140px] overflow-hidden rounded-md ring-2 ring-violet-300 shadow-glow ${
        card.is_foil ? "foil-card" : ""
      }`}
    >
      {card.image_url ? (
        <Image
          src={card.image_url}
          alt={card.card_name}
          fill
          sizes="140px"
          className="object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center px-2 text-center text-xs text-white">
          {card.card_name}
        </div>
      )}
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onChange,
  onAddPage,
  onRemovePage,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  onAddPage: () => void;
  onRemovePage?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          className="btn-ghost px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="px-1 text-ink-300">
          Page {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
          className="btn-ghost px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
      <div className="flex items-center gap-2">
        {onRemovePage && (
          <button
            type="button"
            onClick={onRemovePage}
            className="btn-subtle text-rose-300 hover:bg-rose-400/10"
            title="Remove the last (empty) page"
          >
            − Page
          </button>
        )}
        <button
          type="button"
          onClick={onAddPage}
          disabled={totalPages >= MAX_BINDER_PAGES}
          className="btn-subtle disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Page
        </button>
      </div>
    </div>
  );
}
