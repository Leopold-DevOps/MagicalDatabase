"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  reorderBinderCards,
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
  normalizeBinderSettings,
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

export function BinderView({
  collectionId,
  initialCards,
  initialSettings,
}: Props) {
  const [cards, setCards] = useState<CollectionCard[]>(() =>
    [...initialCards].sort(byPosition),
  );
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Filtering/searching/sorting builds a *display* list. Reorder still
  // operates on the underlying `cards` array so positions stay stable.
  const filteredSorted = useMemo(() => {
    let list = cards;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.card_name.toLowerCase().includes(q));
    }
    if (setFilter) {
      list = list.filter((c) => c.set_code === setFilter);
    }
    return [...list].sort(sortComparator(sort));
  }, [cards, search, setFilter, sort]);

  const sets = useMemo(() => {
    const m = new Map<string, string>();
    cards.forEach((c) => {
      if (c.set_code) {
        m.set(c.set_code, c.set_name ?? c.set_code.toUpperCase());
      }
    });
    return Array.from(m.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cards]);

  const isSorted = sort !== "added-desc" || !!search || !!setFilter;
  const perPage = settings.pocketsPerPage;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSorted.length / perPage) || 1,
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * perPage;
  const pageCards = filteredSorted.slice(pageStart, pageStart + perPage);
  const pageIds = pageCards.map((c) => c.id);
  const activeCard = activeId
    ? cards.find((c) => c.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (isSorted) return; // disabled while a custom sort is active

    const ids = cards.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(cards, oldIndex, newIndex).map((c, i) => ({
      ...c,
      position: i + 1,
    }));
    setCards(next);

    const positions = next.map(({ id, position }) => ({
      id,
      position: position!,
    }));
    startTransition(async () => {
      const result = await reorderBinderCards(collectionId, positions);
      if ("error" in result) {
        // revert if persist fails
        setCards([...initialCards].sort(byPosition));
      }
    });
  }

  function persistSettings(next: BinderSettings) {
    setSettings(next);
    startTransition(async () => {
      const result = await updateBinderSettings(collectionId, next);
      if ("error" in result) {
        setSettings(initialSettings);
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

      {filteredSorted.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="text-ink-300">
            {cards.length === 0
              ? "This binder is empty. Add cards from the search page."
              : "No cards match your search/filter."}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pageIds} strategy={rectSortingStrategy}>
            <BinderPage
              cover={settings.cover}
              style={settings.style}
              layout={settings.pocketsPerPage}
              cards={pageCards}
              isFiltered={isSorted}
            />
          </SortableContext>

          <DragOverlay>
            {activeCard ? (
              <div className="aspect-[5/7] w-full overflow-hidden rounded-md ring-2 ring-violet-400 shadow-glow">
                {activeCard.image_url && (
                  <Image
                    src={activeCard.image_url}
                    alt={activeCard.card_name}
                    width={244}
                    height={340}
                    className="object-cover"
                  />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Pager
        page={safePage}
        totalPages={totalPages}
        onChange={setPage}
        cardCount={filteredSorted.length}
      />
    </div>
  );
}

function byPosition(a: CollectionCard, b: CollectionCard) {
  const pa = a.position ?? Number.MAX_SAFE_INTEGER;
  const pb = b.position ?? Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  return a.added_at.localeCompare(b.added_at);
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
        placeholder="Search this binder…"
        className="input-field flex-1 min-w-[180px]"
        aria-label="Search binder"
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
                className={`h-10 w-full rounded ${BINDER_COVER_GRADIENT[c]}`}
              />
              <p className="mt-1 text-center text-[11px] text-ink-300">
                {BINDER_COVER_LABEL[c]}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BinderPage({
  cover,
  style,
  layout,
  cards,
  isFiltered,
}: {
  cover: BinderCover;
  style: BinderStyle;
  layout: BinderLayout;
  cards: CollectionCard[];
  isFiltered: boolean;
}) {
  const slots = layout;
  const grid = BINDER_LAYOUT_GRID[layout];
  const ringPositions = layout >= 9 ? [10, 35, 60, 85] : [12, 50, 88];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${BINDER_COVER_GRADIENT[cover]} p-4 shadow-glow animate-fade-in-up`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:18px_18px]" />

      <div className="relative flex gap-4">
        {style === "ring" && (
          <div
            className="hidden flex-col items-center justify-evenly py-4 sm:flex"
            aria-hidden
          >
            {ringPositions.map((_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full bg-black/45 ring-1 ring-white/20"
              />
            ))}
          </div>
        )}

        <div className="relative flex-1 rounded-xl bg-ink-950/40 p-3 backdrop-blur-sm">
          <div className={`grid gap-3 ${grid}`}>
            {Array.from({ length: slots }).map((_, i) => {
              const card = cards[i];
              return card ? (
                <Sleeve
                  key={card.id}
                  card={card}
                  draggable={!isFiltered}
                />
              ) : (
                <EmptySleeve key={`empty-${i}`} />
              );
            })}
          </div>
        </div>
      </div>

      <p
        className={`mt-3 text-right text-xs ${BINDER_COVER_INK[cover]} opacity-80`}
      >
        {BINDER_COVER_LABEL[cover]} ·{" "}
        {style === "ring" ? "Ring binder" : "Portfolio"}
      </p>
    </div>
  );
}

function Sleeve({
  card,
  draggable,
}: {
  card: CollectionCard;
  draggable: boolean;
}) {
  const sortable = useSortable({ id: card.id, disabled: !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortable;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(draggable ? listeners : {})}
      className="group relative aspect-[5/7] rounded-md ring-1 ring-white/10 bg-black/30 shadow-md transition hover:scale-[1.03] hover:ring-violet-300/60 hover:shadow-glow"
    >
      <Link
        href={`/cards/${card.scryfall_id}`}
        className="block h-full w-full overflow-hidden rounded-md"
        onClick={(e) => {
          // Prevent navigation while a drag is in progress
          if (isDragging) e.preventDefault();
        }}
      >
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.card_name}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
            draggable={false}
          />
        ) : (
          <div className="grid h-full place-items-center px-2 text-center text-[11px] text-white/80">
            {card.card_name}
          </div>
        )}
      </Link>
      {/* Sleeve gloss */}
      <div className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-br from-white/15 via-transparent to-transparent" />
      {/* Corner gloss highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 rounded-t-md bg-gradient-to-b from-white/15 to-transparent" />
      {card.quantity > 1 && (
        <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          ×{card.quantity}
        </span>
      )}
    </div>
  );
}

function EmptySleeve() {
  const droppable = useDroppable({ id: `empty-${Math.random()}` });
  return (
    <div
      ref={droppable.setNodeRef}
      className="aspect-[5/7] rounded-md border border-dashed border-white/15 bg-black/20"
      aria-hidden
    />
  );
}

function Pager({
  page,
  totalPages,
  onChange,
  cardCount,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  cardCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-ink-400">
      <span>{cardCount} cards</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          className="btn-ghost px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="px-2 text-ink-300">
          Page {page + 1} of {totalPages}
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
    </div>
  );
}
