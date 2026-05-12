export const DECK_FORMATS = [
  "casual",
  "standard",
  "modern",
  "pioneer",
  "pauper",
  "legacy",
  "limited",
  "commander",
  "brawl",
] as const;
export type DeckFormat = (typeof DECK_FORMATS)[number];

export type DeckFormatInfo = {
  label: string;
  limit: number | null;
  hasCommander: boolean;
};

export const DECK_FORMAT_INFO: Record<DeckFormat, DeckFormatInfo> = {
  casual: { label: "Casual", limit: null, hasCommander: false },
  standard: { label: "Standard", limit: 60, hasCommander: false },
  modern: { label: "Modern", limit: 60, hasCommander: false },
  pioneer: { label: "Pioneer", limit: 60, hasCommander: false },
  pauper: { label: "Pauper", limit: 60, hasCommander: false },
  legacy: { label: "Legacy", limit: 60, hasCommander: false },
  limited: { label: "Limited / Draft", limit: 40, hasCommander: false },
  commander: { label: "Commander", limit: 100, hasCommander: true },
  brawl: { label: "Brawl", limit: 60, hasCommander: true },
};

export function isDeckFormat(value: string): value is DeckFormat {
  return (DECK_FORMATS as readonly string[]).includes(value);
}

export function normalizeDeckFormat(value: unknown): DeckFormat {
  if (typeof value === "string" && isDeckFormat(value)) return value;
  return "casual";
}
