export const COLLECTION_TYPES = ["binder", "bulk", "deck"] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number];

export const COLLECTION_TYPE_LABEL: Record<CollectionType, string> = {
  binder: "Binder",
  bulk: "Bulk",
  deck: "Deck",
};

export const COLLECTION_TYPE_BLURB: Record<CollectionType, string> = {
  binder: "Curated showcase. Premium prints, foils, signed cards.",
  bulk: "Loose stockpile. Commons, uncommons, trade fodder.",
  deck: "Built to play. 60-card constructed or 100-card commander.",
};

export const COLLECTION_COLORS = [
  "arcane",
  "ember",
  "forest",
  "tide",
  "sun",
  "shadow",
] as const;
export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export const COLLECTION_COLOR_LABEL: Record<CollectionColor, string> = {
  arcane: "Arcane",
  ember: "Ember",
  forest: "Forest",
  tide: "Tide",
  sun: "Sun",
  shadow: "Shadow",
};

// Tailwind classes are listed as full literal strings so JIT picks them up.
export const COLLECTION_COLOR_GRADIENT: Record<CollectionColor, string> = {
  arcane: "from-violet-500 via-fuchsia-500 to-violet-700",
  ember: "from-rose-500 via-rose-600 to-orange-600",
  forest: "from-emerald-500 via-emerald-600 to-teal-700",
  tide: "from-sky-400 via-cyan-500 to-blue-700",
  sun: "from-amber-300 via-amber-400 to-orange-500",
  shadow: "from-indigo-700 via-slate-800 to-zinc-900",
};

export const COLLECTION_COLOR_RING: Record<CollectionColor, string> = {
  arcane: "shadow-[0_0_40px_-12px_rgba(168,85,247,0.65)]",
  ember: "shadow-[0_0_40px_-12px_rgba(244,63,94,0.6)]",
  forest: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.6)]",
  tide: "shadow-[0_0_40px_-12px_rgba(56,189,248,0.6)]",
  sun: "shadow-[0_0_40px_-12px_rgba(251,191,36,0.6)]",
  shadow: "shadow-[0_0_40px_-12px_rgba(99,102,241,0.55)]",
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  type: CollectionType;
  description: string | null;
  color: CollectionColor;
  binder_settings: Record<string, unknown> | null;
  created_at: string;
};

export type CollectionCard = {
  id: string;
  collection_id: string;
  scryfall_id: string;
  card_name: string;
  set_code: string | null;
  set_name: string | null;
  image_url: string | null;
  quantity: number;
  position: number | null;
  page_index: number | null;
  pocket_index: number | null;
  is_foil: boolean;
  added_at: string;
};

export function isCollectionColor(value: string): value is CollectionColor {
  return (COLLECTION_COLORS as readonly string[]).includes(value);
}
