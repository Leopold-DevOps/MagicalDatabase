// Decklist parsing + formatting for MTG community formats.
//
// Formats supported:
//  - "mtgo"   plain text:  "4 Lightning Bolt"            (qty optional, defaults to 1)
//  - "mtga"   arena export: "4 Lightning Bolt (M21) 162" (set + collector number)
//  - "csv"                : qty,name,set,collector_number,foil   (header row optional)

export type DecklistFormat = "mtgo" | "mtga" | "csv";

export const DECKLIST_FORMAT_LABEL: Record<DecklistFormat, string> = {
  mtgo: "Plain text (MTGO)",
  mtga: "MTG Arena",
  csv: "CSV",
};

export type ParsedLine = {
  qty: number;
  name: string;
  set?: string;
  collectorNumber?: string;
  foil?: boolean;
  isCommander?: boolean;
  /** Original input line, for surfacing errors back to the user. */
  source: string;
};

export type ParseResult = {
  items: ParsedLine[];
  /** Lines we couldn't make sense of, returned verbatim. */
  unparsed: string[];
};

const QTY_NAME = /^\s*(?:(\d+)\s*x?\s+)?(.+?)\s*$/;
// "4 Lightning Bolt (M21) 162" — qty?, name, (set), collector_number
const MTGA_LINE = /^\s*(?:(\d+)\s+)?(.+?)\s+\(([A-Za-z0-9]+)\)\s+([A-Za-z0-9★]+)\s*(\*F\*)?\s*$/;
const FOIL_TAG = /\s*\*F\*\s*$/;

const SECTION_COMMANDER = /^\s*commander\s*[:]?\s*$/i;
const SECTION_SIDEBOARD = /^\s*sideboard\s*[:]?\s*$/i;
const SECTION_MAYBE = /^\s*maybeboard\s*[:]?\s*$/i;
const SECTION_DECK = /^\s*(?:deck|mainboard|main)\s*[:]?\s*$/i;
const COMMENT = /^\s*(?:\/\/|#)/;

export function parseDecklist(text: string): ParseResult {
  // Auto-detect: lines with commas → CSV; else line-based (MTGA/MTGO).
  const trimmed = text.trim();
  if (!trimmed) return { items: [], unparsed: [] };

  if (looksLikeCSV(trimmed)) return parseCSV(trimmed);
  return parseLineBased(trimmed);
}

function looksLikeCSV(text: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0]!.toLowerCase();
  // Header heuristic: presence of "name" and "qty" or "quantity" in the first
  // line, OR a comma-separated first non-empty line where the first field
  // parses as a number.
  if (/qty|quantity/.test(firstLine) && /name/.test(firstLine)) return true;
  return /^\s*\d+\s*,/.test(text);
}

function parseCSV(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { items: [], unparsed: [] };

  // Drop a header row if present.
  let start = 0;
  const firstLower = lines[0]!.toLowerCase();
  if (
    /qty|quantity/.test(firstLower) &&
    /name/.test(firstLower) &&
    !/^\s*\d/.test(lines[0]!)
  ) {
    start = 1;
  }

  const items: ParsedLine[] = [];
  const unparsed: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i]!;
    const cells = parseCSVRow(raw);
    if (cells.length < 2) {
      unparsed.push(raw);
      continue;
    }
    const qty = parseInt(cells[0]!, 10);
    const name = (cells[1] ?? "").trim();
    if (!Number.isFinite(qty) || qty <= 0 || !name) {
      unparsed.push(raw);
      continue;
    }
    items.push({
      qty,
      name,
      set: cells[2]?.trim() || undefined,
      collectorNumber: cells[3]?.trim() || undefined,
      foil: parseFoilCell(cells[4]),
      source: raw,
    });
  }
  return { items, unparsed };
}

function parseCSVRow(row: string): string[] {
  // Minimal CSV: handles quoted fields with embedded commas. Doesn't try to
  // be RFC 4180 perfect — good enough for hand-pasted decklists.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]!;
    if (inQuotes) {
      if (ch === '"' && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseFoilCell(cell: string | undefined): boolean | undefined {
  if (!cell) return undefined;
  const v = cell.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "foil") return true;
  if (v === "false" || v === "0" || v === "no" || v === "") return false;
  return undefined;
}

function parseLineBased(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const items: ParsedLine[] = [];
  const unparsed: string[] = [];
  let inCommanderSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || COMMENT.test(line)) continue;

    if (SECTION_COMMANDER.test(line)) {
      inCommanderSection = true;
      continue;
    }
    if (
      SECTION_DECK.test(line) ||
      SECTION_SIDEBOARD.test(line) ||
      SECTION_MAYBE.test(line)
    ) {
      inCommanderSection = false;
      continue;
    }

    // Try MTGA-shaped first — it's strictly more specific.
    const mtga = MTGA_LINE.exec(line);
    if (mtga) {
      const qty = mtga[1] ? parseInt(mtga[1], 10) : 1;
      items.push({
        qty,
        name: mtga[2]!.trim(),
        set: mtga[3],
        collectorNumber: mtga[4],
        foil: !!mtga[5],
        isCommander: inCommanderSection || undefined,
        source: raw,
      });
      continue;
    }

    // Plain "qty name" with optional *F* suffix.
    const foil = FOIL_TAG.test(line);
    const stripped = line.replace(FOIL_TAG, "");
    const m = QTY_NAME.exec(stripped);
    if (!m) {
      unparsed.push(raw);
      continue;
    }
    const qty = m[1] ? parseInt(m[1], 10) : 1;
    const name = m[2]!.trim();
    if (!name) {
      unparsed.push(raw);
      continue;
    }
    items.push({
      qty,
      name,
      foil: foil || undefined,
      isCommander: inCommanderSection || undefined,
      source: raw,
    });
  }

  return { items, unparsed };
}

// ───────────── Formatters ─────────────

export type FormatItem = {
  qty: number;
  name: string;
  set?: string | null;
  collectorNumber?: string | null;
  foil?: boolean;
  isCommander?: boolean;
};

export function formatMTGO(items: FormatItem[]): string {
  const main = items.filter((i) => !i.isCommander);
  const commanders = items.filter((i) => i.isCommander);
  const lines: string[] = [];
  for (const it of main) {
    lines.push(`${it.qty} ${it.name}${it.foil ? " *F*" : ""}`);
  }
  if (commanders.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Commander:");
    for (const it of commanders) {
      lines.push(`${it.qty} ${it.name}${it.foil ? " *F*" : ""}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function formatMTGA(items: FormatItem[]): string {
  const main = items.filter((i) => !i.isCommander);
  const commanders = items.filter((i) => i.isCommander);
  const fmt = (it: FormatItem) => {
    const set = (it.set ?? "").toUpperCase();
    const num = it.collectorNumber ?? "";
    const trail = set && num ? ` (${set}) ${num}` : "";
    return `${it.qty} ${it.name}${trail}${it.foil ? " *F*" : ""}`;
  };
  const lines: string[] = [];
  if (commanders.length > 0) {
    lines.push("Commander");
    for (const it of commanders) lines.push(fmt(it));
    lines.push("");
    lines.push("Deck");
  }
  for (const it of main) lines.push(fmt(it));
  return lines.join("\n") + "\n";
}

export function formatCSV(items: FormatItem[]): string {
  const lines = ["qty,name,set,collector_number,foil,commander"];
  for (const it of items) {
    lines.push(
      [
        it.qty,
        csvEscape(it.name),
        csvEscape(it.set ?? ""),
        csvEscape(it.collectorNumber ?? ""),
        it.foil ? "true" : "false",
        it.isCommander ? "true" : "false",
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatFor(format: DecklistFormat, items: FormatItem[]): string {
  switch (format) {
    case "mtgo":
      return formatMTGO(items);
    case "mtga":
      return formatMTGA(items);
    case "csv":
      return formatCSV(items);
  }
}
