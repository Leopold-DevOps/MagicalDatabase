export const BINDER_LAYOUTS = [4, 9, 12] as const;
export type BinderLayout = (typeof BINDER_LAYOUTS)[number];

export const BINDER_LAYOUT_GRID: Record<BinderLayout, string> = {
  4: "grid-cols-2",
  9: "grid-cols-3",
  12: "grid-cols-3",
};

export const BINDER_STYLES = ["ring", "portfolio"] as const;
export type BinderStyle = (typeof BINDER_STYLES)[number];

export const BINDER_STYLE_LABEL: Record<BinderStyle, string> = {
  ring: "Ring binder",
  portfolio: "Portfolio",
};

export const BINDER_COVERS = [
  "arcane",
  "forest",
  "crimson",
  "midnight",
  "foil",
  "parchment",
] as const;
export type BinderCover = (typeof BINDER_COVERS)[number];

export const BINDER_COVER_LABEL: Record<BinderCover, string> = {
  arcane: "Arcane",
  forest: "Forest",
  crimson: "Crimson",
  midnight: "Midnight",
  foil: "Foil",
  parchment: "Parchment",
};

// Tailwind utilities are listed as full literals so JIT picks them up.
export const BINDER_COVER_GRADIENT: Record<BinderCover, string> = {
  arcane:
    "bg-gradient-to-br from-violet-700 via-fuchsia-800 to-violet-950",
  forest:
    "bg-gradient-to-br from-emerald-700 via-emerald-900 to-teal-950",
  crimson:
    "bg-gradient-to-br from-rose-700 via-rose-900 to-red-950",
  midnight:
    "bg-gradient-to-br from-indigo-900 via-slate-900 to-zinc-950",
  foil:
    "bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300",
  parchment:
    "bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500",
};

export const BINDER_COVER_INK: Record<BinderCover, string> = {
  arcane: "text-violet-100",
  forest: "text-emerald-100",
  crimson: "text-rose-100",
  midnight: "text-indigo-100",
  foil: "text-zinc-900",
  parchment: "text-amber-950",
};

export type BinderSettings = {
  pocketsPerPage: BinderLayout;
  style: BinderStyle;
  cover: BinderCover;
  pageCount: number;
};

export const DEFAULT_BINDER_SETTINGS: BinderSettings = {
  pocketsPerPage: 9,
  style: "ring",
  cover: "arcane",
  pageCount: 1,
};

export const MAX_BINDER_PAGES = 99;

export function normalizeBinderSettings(input: unknown): BinderSettings {
  const safe =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const layout = (BINDER_LAYOUTS as readonly number[]).includes(
    safe.pocketsPerPage as number,
  )
    ? (safe.pocketsPerPage as BinderLayout)
    : DEFAULT_BINDER_SETTINGS.pocketsPerPage;
  const style = (BINDER_STYLES as readonly string[]).includes(
    safe.style as string,
  )
    ? (safe.style as BinderStyle)
    : DEFAULT_BINDER_SETTINGS.style;
  const cover = (BINDER_COVERS as readonly string[]).includes(
    safe.cover as string,
  )
    ? (safe.cover as BinderCover)
    : DEFAULT_BINDER_SETTINGS.cover;
  const pageCount =
    typeof safe.pageCount === "number" && safe.pageCount > 0
      ? Math.min(MAX_BINDER_PAGES, Math.floor(safe.pageCount))
      : DEFAULT_BINDER_SETTINGS.pageCount;
  return { pocketsPerPage: layout, style, cover, pageCount };
}

export const SORT_OPTIONS = [
  { value: "added-desc", label: "Newest first" },
  { value: "added-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name A→Z" },
  { value: "name-desc", label: "Name Z→A" },
  { value: "set-asc", label: "Set A→Z" },
  { value: "qty-desc", label: "Quantity high→low" },
  { value: "qty-asc", label: "Quantity low→high" },
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
