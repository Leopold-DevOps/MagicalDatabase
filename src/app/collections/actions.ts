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
): Promise<{ ok: true } | { error: string }> {
  if (!collectionId) return { error: "Missing collection" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const normalized = normalizeBinderSettings(settings);
  const { error } = await supabase
    .from("collections")
    .update({ binder_settings: normalized })
    .eq("id", collectionId);

  if (error) return { error: error.message };
  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
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
): Promise<{ ok: true } | { error: string }> {
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
  // tray, split: decrement source, insert a new placed row with quantity 1.
  async function placeDragged(targetPage: number, targetPocket: number) {
    if (draggedFromTray && (card.quantity ?? 1) > 1) {
      const u = await supabase
        .from("collection_cards")
        .update({ quantity: card.quantity - 1 })
        .eq("id", card.id);
      if (u.error) return u.error;
      const ins = await supabase.from("collection_cards").insert({
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
      });
      if (ins.error) return ins.error;
      return null;
    }
    const u = await supabase
      .from("collection_cards")
      .update({ page_index: targetPage, pocket_index: targetPocket })
      .eq("id", card.id);
    return u.error;
  }

  if (!occupant) {
    const e = await placeDragged(page, pocket);
    if (e) return { error: e.message };
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
    const e = await placeDragged(page, pocket);
    if (e) return { error: e.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
}
