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

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  type: CollectionType;
  description: string | null;
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
  added_at: string;
};
