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
