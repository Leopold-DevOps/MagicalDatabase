const BASE = "https://api.scryfall.com";

export type ScryfallImageUris = {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
};

export type ScryfallCardFace = {
  name: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  flavor_text?: string;
  image_uris?: ScryfallImageUris;
};

export type ScryfallCard = {
  id: string;
  name: string;
  released_at?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors?: string[];
  color_identity?: string[];
  rarity?: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  artist?: string;
  flavor_text?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  prices?: Record<string, string | null>;
  scryfall_uri?: string;
  legalities?: Record<string, string>;
  oracle_id?: string;
  prints_search_uri?: string;
};

export type ScryfallSearchResponse = {
  object: "list";
  total_cards?: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
};

async function scryfallFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MagicalDatabase/0.1 (https://github.com/Leopold-DevOps/magicaldatabase)",
    },
    next: { revalidate: 60 * 5 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ScryfallError(res.status, body || res.statusText);
  }
  return (await res.json()) as T;
}

export class ScryfallError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ScryfallError";
  }
}

export async function searchCards(
  query: string,
  page = 1,
): Promise<ScryfallSearchResponse> {
  const q = encodeURIComponent(query);
  return scryfallFetch<ScryfallSearchResponse>(
    `/cards/search?q=${q}&page=${page}&order=name`,
  );
}

export async function getCard(id: string): Promise<ScryfallCard> {
  return scryfallFetch<ScryfallCard>(`/cards/${encodeURIComponent(id)}`);
}

/**
 * Bulk-resolve cards by Scryfall ID. Scryfall caps the collection endpoint at
 * 75 identifiers per request, so we chunk and concatenate. Cards that aren't
 * found are silently skipped (Scryfall returns them in a `not_found` array we
 * don't surface here).
 */
export async function getCardsByIds(ids: string[]): Promise<ScryfallCard[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 75) chunks.push(ids.slice(i, i + 75));

  const all: ScryfallCard[] = [];
  for (const chunk of chunks) {
    const res = await fetch(`${BASE}/cards/collection`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "MagicalDatabase/0.1 (https://github.com/Leopold-DevOps/magicaldatabase)",
      },
      body: JSON.stringify({
        identifiers: chunk.map((id) => ({ id })),
      }),
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) {
      throw new ScryfallError(res.status, res.statusText);
    }
    const data = (await res.json()) as { data: ScryfallCard[] };
    all.push(...data.data);
  }
  return all;
}

export type ScryfallIdentifier =
  | { id: string }
  | { name: string }
  | { name: string; set: string }
  | { set: string; collector_number: string };

/**
 * Resolve cards by mixed identifiers (name, name+set, set+collector_number).
 * Returns the matched cards in the same order as identifiers when possible,
 * plus the identifiers Scryfall couldn't find so the caller can surface
 * import errors. Chunked at 75 per request.
 */
export async function resolveCardIdentifiers(
  identifiers: ScryfallIdentifier[],
): Promise<{ data: ScryfallCard[]; notFound: ScryfallIdentifier[] }> {
  if (identifiers.length === 0) return { data: [], notFound: [] };
  const allData: ScryfallCard[] = [];
  const notFound: ScryfallIdentifier[] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    const chunk = identifiers.slice(i, i + 75);
    const res = await fetch(`${BASE}/cards/collection`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent":
          "MagicalDatabase/0.1 (https://github.com/Leopold-DevOps/magicaldatabase)",
      },
      body: JSON.stringify({ identifiers: chunk }),
      cache: "no-store",
    });
    if (!res.ok) throw new ScryfallError(res.status, res.statusText);
    const body = (await res.json()) as {
      data: ScryfallCard[];
      not_found?: ScryfallIdentifier[];
    };
    allData.push(...body.data);
    if (body.not_found) notFound.push(...body.not_found);
  }
  return { data: allData, notFound };
}

export async function getPrints(
  card: ScryfallCard,
): Promise<ScryfallCard[]> {
  const oracleId = card.oracle_id;
  if (!oracleId) return [];
  const data = await scryfallFetch<ScryfallSearchResponse>(
    `/cards/search?q=oracleid%3A${encodeURIComponent(oracleId)}&unique=prints&order=released&dir=desc`,
  );
  return data.data ?? [];
}

export function primaryImage(card: ScryfallCard): string | undefined {
  if (card.image_uris?.normal) return card.image_uris.normal;
  return card.card_faces?.[0]?.image_uris?.normal;
}

export function smallImage(card: ScryfallCard): string | undefined {
  if (card.image_uris?.small) return card.image_uris.small;
  return card.card_faces?.[0]?.image_uris?.small;
}
