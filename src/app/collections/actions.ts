"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeBinderSettings } from "@/lib/binder";
import {
  COLLECTION_COLORS,
  COLLECTION_TYPES,
  isCollectionColor,
  type CollectionColor,
  type CollectionType,
} from "@/lib/collections";
import { isDeckFormat } from "@/lib/deck";
import { parseDecklist } from "@/lib/decklist";
import {
  resolveCardIdentifiers,
  type ScryfallIdentifier,
} from "@/lib/scryfall";
import { supabaseServer } from "@/lib/supabase/server";

function field(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createCollection(formData: FormData): Promise<void> {
  const name = field(formData, "name");
  const type = field(formData, "type") as CollectionType;
  const description = field(formData, "description") || null;
  const colorRaw = field(formData, "color") || "arcane";
  const color: CollectionColor = isCollectionColor(colorRaw)
    ? colorRaw
    : "arcane";

  if (!name) redirect("/collections/new?error=name");
  if (!COLLECTION_TYPES.includes(type)) redirect("/collections/new?error=type");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/collections/new");

  const { data, error } = await supabase
    .from("collections")
    .insert({ name, type, description, color, user_id: user.id })
    .select("id")
    .single();

  if (error) redirect("/collections/new?error=db");

  revalidatePath("/collections");
  redirect(`/collections/${data!.id}`);
}

export async function updateCollection(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const name = field(formData, "name");
  const description = field(formData, "description") || null;
  const colorRaw = field(formData, "color") || "arcane";
  const color: CollectionColor = isCollectionColor(colorRaw)
    ? colorRaw
    : "arcane";

  if (!id) redirect("/collections");
  if (!name) redirect(`/collections/${id}/edit?error=${encodeURIComponent("Name is required.")}`);
  if (!COLLECTION_COLORS.includes(color))
    redirect(`/collections/${id}/edit?error=${encodeURIComponent("Pick a valid color.")}`);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/collections/${id}/edit`);

  const { data, error } = await supabase
    .from("collections")
    .update({ name, description, color })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    redirect(
      `/collections/${id}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }
  if (!data) {
    redirect(
      `/collections/${id}/edit?error=${encodeURIComponent(
        "No row updated. If you just added the color column, run supabase/migrations/0002_collection_color.sql in the Supabase SQL editor.",
      )}`,
    );
  }

  revalidatePath("/collections");
  revalidatePath(`/collections/${id}`);
  redirect(`/collections/${id}`);
}

export async function deleteCollection(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  if (!id) return;
  const supabase = await supabaseServer();
  await supabase.from("collections").delete().eq("id", id);
  revalidatePath("/collections");
  redirect("/collections");
}

export async function addCardToCollection(formData: FormData) {
  const collectionId = field(formData, "collection_id");
  const scryfallId = field(formData, "scryfall_id");
  const cardName = field(formData, "card_name");
  const setCode = field(formData, "set_code") || null;
  const setName = field(formData, "set_name") || null;
  const imageUrl = field(formData, "image_url") || null;
  const quantity = Math.max(1, Number(field(formData, "quantity") || "1"));
  const isFoil = field(formData, "is_foil") === "true";

  if (!collectionId || !scryfallId || !cardName) {
    return { error: "Missing required fields." };
  }

  const supabase = await supabaseServer();

  // Try to merge with an existing tray row (same scryfall + foil flag, unplaced).
  const { data: existing } = await supabase
    .from("collection_cards")
    .select("id, quantity")
    .eq("collection_id", collectionId)
    .eq("scryfall_id", scryfallId)
    .eq("is_foil", isFoil)
    .is("page_index", null)
    .is("pocket_index", null)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("collection_cards")
      .update({ quantity: (existing.quantity ?? 0) + quantity })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("collection_cards").insert({
      collection_id: collectionId,
      scryfall_id: scryfallId,
      card_name: cardName,
      set_code: setCode,
      set_name: setName,
      image_url: imageUrl,
      quantity,
      is_foil: isFoil,
      page_index: null,
      pocket_index: null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true as const };
}

export async function removeCardFromCollection(
  formData: FormData,
): Promise<void> {
  const id = field(formData, "id");
  const collectionId = field(formData, "collection_id");
  if (!id) return;
  const supabase = await supabaseServer();
  await supabase.from("collection_cards").delete().eq("id", id);
  if (collectionId) revalidatePath(`/collections/${collectionId}`);
}

export async function updateBinderSettings(
  collectionId: string,
  settings: unknown,
): Promise<{ ok: true; movedToTray: number } | { error: string }> {
  if (!collectionId) return { error: "Missing collection" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const normalized = normalizeBinderSettings(settings);

  // If the user is shrinking pocketsPerPage, sweep cards that no longer fit
  // (pocket_index >= newPocketsPerPage) back to the tray so they don't get
  // orphaned in pockets that don't exist in the new layout.
  let movedToTray = 0;
  const { data: overflow } = await supabase
    .from("collection_cards")
    .select("*")
    .eq("collection_id", collectionId)
    .gte("pocket_index", normalized.pocketsPerPage);

  if (overflow && overflow.length > 0) {
    for (const card of overflow) {
      const { data: trayStack } = await supabase
        .from("collection_cards")
        .select("id, quantity")
        .eq("collection_id", collectionId)
        .eq("scryfall_id", card.scryfall_id)
        .eq("is_foil", card.is_foil)
        .is("page_index", null)
        .is("pocket_index", null)
        .neq("id", card.id)
        .limit(1)
        .maybeSingle();

      if (trayStack) {
        const u = await supabase
          .from("collection_cards")
          .update({
            quantity: (trayStack.quantity ?? 0) + (card.quantity ?? 1),
          })
          .eq("id", trayStack.id);
        if (u.error) return { error: u.error.message };
        const d = await supabase
          .from("collection_cards")
          .delete()
          .eq("id", card.id);
        if (d.error) return { error: d.error.message };
      } else {
        const u = await supabase
          .from("collection_cards")
          .update({ page_index: null, pocket_index: null })
          .eq("id", card.id);
        if (u.error) return { error: u.error.message };
      }
      movedToTray++;
    }
  }

  const { error } = await supabase
    .from("collections")
    .update({ binder_settings: normalized })
    .eq("id", collectionId);

  if (error) return { error: error.message };
  revalidatePath(`/collections/${collectionId}`);
  return { ok: true, movedToTray };
}

/**
 * Move a card from wherever it is now to a target slot or back to the tray.
 * Splits stacks of >1 when placing in a pocket; merges into an existing tray
 * stack of the same printing+foil when un-placing.
 */
export async function moveCard(
  collectionId: string,
  cardId: string,
  target: { type: "tray" } | { type: "pocket"; page: number; pocket: number },
): Promise<{ ok: true; newId?: string } | { error: string }> {
  if (!collectionId || !cardId) return { error: "Missing args" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: card } = await supabase
    .from("collection_cards")
    .select("*")
    .eq("id", cardId)
    .eq("collection_id", collectionId)
    .maybeSingle();
  if (!card) return { error: "Card not found" };

  // Drop on tray — un-place this card and merge with an existing tray stack
  // of the same printing + foil flag if one exists.
  if (target.type === "tray") {
    if (card.page_index === null && card.pocket_index === null) {
      return { ok: true };
    }
    const { data: trayStack } = await supabase
      .from("collection_cards")
      .select("id, quantity")
      .eq("collection_id", collectionId)
      .eq("scryfall_id", card.scryfall_id)
      .eq("is_foil", card.is_foil)
      .is("page_index", null)
      .is("pocket_index", null)
      .neq("id", card.id)
      .limit(1)
      .maybeSingle();

    if (trayStack) {
      const u1 = await supabase
        .from("collection_cards")
        .update({ quantity: (trayStack.quantity ?? 0) + (card.quantity ?? 1) })
        .eq("id", trayStack.id);
      if (u1.error) return { error: u1.error.message };
      const d = await supabase
        .from("collection_cards")
        .delete()
        .eq("id", card.id);
      if (d.error) return { error: d.error.message };
    } else {
      const u = await supabase
        .from("collection_cards")
        .update({ page_index: null, pocket_index: null })
        .eq("id", card.id);
      if (u.error) return { error: u.error.message };
    }
    revalidatePath(`/collections/${collectionId}`);
    return { ok: true };
  }

  // Drop on a pocket
  const { page, pocket } = target;

  // Already there
  if (card.page_index === page && card.pocket_index === pocket) {
    return { ok: true };
  }

  const { data: occupant } = await supabase
    .from("collection_cards")
    .select("*")
    .eq("collection_id", collectionId)
    .eq("page_index", page)
    .eq("pocket_index", pocket)
    .neq("id", card.id)
    .maybeSingle();

  const draggedFromTray =
    card.page_index === null && card.pocket_index === null;

  // Helper: actually place the dragged card. If it's a stack of >1 from the
  // tray, split: decrement source, insert a new placed row with quantity 1,
  // and return the new row's real UUID so the client can reconcile its
  // optimistic __optimistic-${id} placeholder.
  async function placeDragged(
    targetPage: number,
    targetPocket: number,
  ): Promise<{ err: string | null; newId?: string }> {
    if (draggedFromTray && (card.quantity ?? 1) > 1) {
      const u = await supabase
        .from("collection_cards")
        .update({ quantity: card.quantity - 1 })
        .eq("id", card.id);
      if (u.error) return { err: u.error.message };
      const ins = await supabase
        .from("collection_cards")
        .insert({
          collection_id: collectionId,
          scryfall_id: card.scryfall_id,
          card_name: card.card_name,
          set_code: card.set_code,
          set_name: card.set_name,
          image_url: card.image_url,
          is_foil: card.is_foil,
          quantity: 1,
          page_index: targetPage,
          pocket_index: targetPocket,
        })
        .select("id")
        .single();
      if (ins.error) return { err: ins.error.message };
      return { err: null, newId: ins.data.id };
    }
    const u = await supabase
      .from("collection_cards")
      .update({ page_index: targetPage, pocket_index: targetPocket })
      .eq("id", card.id);
    return { err: u.error?.message ?? null };
  }

  if (!occupant) {
    const { err, newId } = await placeDragged(page, pocket);
    if (err) return { error: err };
    revalidatePath(`/collections/${collectionId}`);
    return { ok: true, newId };
  } else if (!draggedFromTray) {
    // Swap two placed cards. Park occupant on null first to avoid any
    // partial-uniqueness conflicts (no constraint today, but keeps semantics
    // identical if we ever add one).
    const oldPage = card.page_index!;
    const oldPocket = card.pocket_index!;
    const park = await supabase
      .from("collection_cards")
      .update({ page_index: null, pocket_index: null })
      .eq("id", occupant.id);
    if (park.error) return { error: park.error.message };
    const moveDragged = await supabase
      .from("collection_cards")
      .update({ page_index: page, pocket_index: pocket })
      .eq("id", card.id);
    if (moveDragged.error) return { error: moveDragged.error.message };
    const moveOccupant = await supabase
      .from("collection_cards")
      .update({ page_index: oldPage, pocket_index: oldPocket })
      .eq("id", occupant.id);
    if (moveOccupant.error) return { error: moveOccupant.error.message };
    revalidatePath(`/collections/${collectionId}`);
    return { ok: true };
  } else {
    // Dragged from tray onto an occupied pocket → bump occupant to tray, then place.
    // Bump first (recursive-style call inlined).
    const { data: trayStack } = await supabase
      .from("collection_cards")
      .select("id, quantity")
      .eq("collection_id", collectionId)
      .eq("scryfall_id", occupant.scryfall_id)
      .eq("is_foil", occupant.is_foil)
      .is("page_index", null)
      .is("pocket_index", null)
      .limit(1)
      .maybeSingle();
    if (trayStack) {
      const u1 = await supabase
        .from("collection_cards")
        .update({
          quantity: (trayStack.quantity ?? 0) + (occupant.quantity ?? 1),
        })
        .eq("id", trayStack.id);
      if (u1.error) return { error: u1.error.message };
      const d = await supabase
        .from("collection_cards")
        .delete()
        .eq("id", occupant.id);
      if (d.error) return { error: d.error.message };
    } else {
      const u = await supabase
        .from("collection_cards")
        .update({ page_index: null, pocket_index: null })
        .eq("id", occupant.id);
      if (u.error) return { error: u.error.message };
    }
    const { err, newId } = await placeDragged(page, pocket);
    if (err) return { error: err };
    revalidatePath(`/collections/${collectionId}`);
    return { ok: true, newId };
  }
}

export async function setDeckFormat(
  collectionId: string,
  format: string,
): Promise<{ ok: true } | { error: string }> {
  if (!collectionId) return { error: "Missing collection" };
  if (!isDeckFormat(format)) return { error: "Unknown format" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("collections")
    .update({ deck_format: format })
    .eq("id", collectionId);
  if (error) return { error: error.message };

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
}

/**
 * Toggle a card as the deck's commander. Only one card may be the
 * commander at a time, so we clear any other is_commander rows in the
 * same collection first.
 */
export async function setCommander(
  collectionId: string,
  cardId: string,
  makeCommander: boolean,
): Promise<{ ok: true } | { error: string }> {
  if (!collectionId || !cardId) return { error: "Missing args" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  if (makeCommander) {
    const clear = await supabase
      .from("collection_cards")
      .update({ is_commander: false })
      .eq("collection_id", collectionId)
      .eq("is_commander", true);
    if (clear.error) return { error: clear.error.message };
  }

  const { error } = await supabase
    .from("collection_cards")
    .update({ is_commander: makeCommander })
    .eq("id", cardId)
    .eq("collection_id", collectionId);
  if (error) return { error: error.message };

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
}

/**
 * Set or clear the cover image for a collection. The chosen card must
 * still exist in the collection — we look it up by id+collection_id and
 * store its scryfall_id + the art-only image variant on the collection
 * row. Pass null to clear.
 */
export async function setCollectionCover(
  collectionId: string,
  cardId: string | null,
): Promise<{ ok: true } | { error: string }> {
  if (!collectionId) return { error: "Missing collection" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  if (cardId === null) {
    const { error } = await supabase
      .from("collections")
      .update({ cover_scryfall_id: null, cover_image_url: null })
      .eq("id", collectionId);
    if (error) return { error: error.message };
    revalidatePath(`/collections/${collectionId}`);
    revalidatePath("/collections");
    return { ok: true };
  }

  const { data: card } = await supabase
    .from("collection_cards")
    .select("scryfall_id, image_url")
    .eq("id", cardId)
    .eq("collection_id", collectionId)
    .maybeSingle();
  if (!card) return { error: "Card not in this collection" };

  const { error } = await supabase
    .from("collections")
    .update({
      cover_scryfall_id: card.scryfall_id,
      cover_image_url: toArtCropUrl(card.image_url),
    })
    .eq("id", collectionId);
  if (error) return { error: error.message };

  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/collections");
  return { ok: true };
}

/**
 * Scryfall serves image variants at predictable paths — swapping the
 * `/normal/` or `/large/` segment for `/art_crop/` yields the art-only
 * crop (no card frame, no name, no text box), which makes a much
 * better banner than a tiny full-card thumbnail. Non-Scryfall URLs
 * pass through untouched.
 */
function toArtCropUrl(url: string | null): string | null {
  if (!url) return null;
  if (!url.includes("scryfall")) return url;
  return url
    .replace("/normal/", "/art_crop/")
    .replace("/large/", "/art_crop/")
    .replace("/small/", "/art_crop/")
    .replace("/png/", "/art_crop/");
}

export type ImportSummary = {
  added: number;
  matched: number;
  notFound: string[];
  unparsed: string[];
};

/**
 * Parse a pasted decklist (MTGO / MTGA / CSV — auto-detected), resolve every
 * line against Scryfall, and insert matching cards into the collection's
 * tray. Stacks of the same printing + foil flag are merged into existing
 * tray rows. For deck collections, the first card in a `Commander:` section
 * is also flagged as the deck's commander.
 */
export async function importDecklist(
  collectionId: string,
  text: string,
  options: { allowCommander?: boolean; replace?: boolean } = {},
): Promise<{ ok: true; summary: ImportSummary } | { error: string }> {
  if (!collectionId) return { error: "Missing collection" };
  if (!text || !text.trim()) return { error: "Nothing to import" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = parseDecklist(text);
  if (parsed.items.length === 0) {
    return {
      ok: true,
      summary: {
        added: 0,
        matched: 0,
        notFound: [],
        unparsed: parsed.unparsed,
      },
    };
  }

  // Build identifiers — prefer (set, collector_number) when both are
  // present, else (name, set), else (name). Done before the destructive
  // delete so a Scryfall outage doesn't wipe the collection.
  const identifiers: ScryfallIdentifier[] = parsed.items.map((it) => {
    if (it.set && it.collectorNumber) {
      return {
        set: it.set.toLowerCase(),
        collector_number: it.collectorNumber,
      };
    }
    if (it.set) return { name: it.name, set: it.set.toLowerCase() };
    return { name: it.name };
  });

  let resolved;
  try {
    resolved = await resolveCardIdentifiers(identifiers);
  } catch (err) {
    return { error: `Scryfall lookup failed: ${(err as Error).message}` };
  }

  // Replace mode: now that we have a resolved list to insert, it's safe to
  // wipe what's there. The cover_image_url on the collection row survives
  // because it's a URL string, not a row reference.
  if (options.replace === true) {
    const del = await supabase
      .from("collection_cards")
      .delete()
      .eq("collection_id", collectionId);
    if (del.error) return { error: del.error.message };
  }

  // Match resolved cards back to parsed items by name (case-insensitive,
  // tolerates split-card "//" returned as just the front face).
  const byName = new Map<string, (typeof resolved.data)[number]>();
  for (const card of resolved.data) {
    byName.set(card.name.toLowerCase(), card);
    const front = card.name.split("//")[0]?.trim().toLowerCase();
    if (front && !byName.has(front)) byName.set(front, card);
  }

  const summary: ImportSummary = {
    added: 0,
    matched: 0,
    notFound: [],
    unparsed: parsed.unparsed,
  };

  let assignedCommander = false;
  for (const item of parsed.items) {
    const card = byName.get(item.name.toLowerCase());
    if (!card) {
      summary.notFound.push(item.source);
      continue;
    }
    summary.matched++;

    const isFoil = item.foil === true;
    const imageUrl =
      card.image_uris?.normal ??
      card.card_faces?.[0]?.image_uris?.normal ??
      card.image_uris?.large ??
      card.image_uris?.small ??
      null;

    const { data: existing } = await supabase
      .from("collection_cards")
      .select("id, quantity")
      .eq("collection_id", collectionId)
      .eq("scryfall_id", card.id)
      .eq("is_foil", isFoil)
      .is("page_index", null)
      .is("pocket_index", null)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const u = await supabase
        .from("collection_cards")
        .update({ quantity: (existing.quantity ?? 0) + item.qty })
        .eq("id", existing.id);
      if (u.error) return { error: u.error.message };
      summary.added += item.qty;
    } else {
      const shouldFlagCommander =
        options.allowCommander === true &&
        item.isCommander === true &&
        !assignedCommander;
      const ins = await supabase.from("collection_cards").insert({
        collection_id: collectionId,
        scryfall_id: card.id,
        card_name: card.name,
        set_code: card.set ?? null,
        set_name: card.set_name ?? null,
        image_url: imageUrl,
        quantity: item.qty,
        is_foil: isFoil,
        is_commander: shouldFlagCommander,
        page_index: null,
        pocket_index: null,
      });
      if (ins.error) return { error: ins.error.message };
      summary.added += item.qty;
      if (shouldFlagCommander) assignedCommander = true;
    }
  }

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true, summary };
}
