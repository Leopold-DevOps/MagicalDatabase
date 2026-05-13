/**
 * Resolve a card name to its canonical Scryfall art_crop URL. We hit
 * /cards/named server-side and pull image_uris.art_crop out of the
 * JSON instead of relying on the redirect form (?format=image), which
 * doesn't always work as a CSS bg-image. Weekly revalidate keeps this
 * cached at the Next fetch layer.
 */
export async function resolveScryfallArtCrop(
  cardName: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "MagicalDatabase/0.1 (https://github.com/Leopold-DevOps/magicaldatabase)",
        },
        next: { revalidate: 60 * 60 * 24 * 7 },
      },
    );
    if (!res.ok) return null;
    const card = (await res.json()) as {
      image_uris?: { art_crop?: string };
      card_faces?: { image_uris?: { art_crop?: string } }[];
    };
    return (
      card.image_uris?.art_crop ??
      card.card_faces?.[0]?.image_uris?.art_crop ??
      null
    );
  } catch {
    return null;
  }
}
