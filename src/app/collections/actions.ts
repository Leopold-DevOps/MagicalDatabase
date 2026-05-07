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

  if (!collectionId || !scryfallId || !cardName) {
    return { error: "Missing required fields." };
  }

  const supabase = await supabaseServer();
  const { data: maxRow } = await supabase
    .from("collection_cards")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? 0) + 1;

  const { error } = await supabase.from("collection_cards").insert({
    collection_id: collectionId,
    scryfall_id: scryfallId,
    card_name: cardName,
    set_code: setCode,
    set_name: setName,
    image_url: imageUrl,
    quantity,
    position: nextPosition,
  });

  if (error) return { error: error.message };
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

export async function reorderBinderCards(
  collectionId: string,
  positions: { id: string; position: number }[],
): Promise<{ ok: true } | { error: string }> {
  if (!collectionId || positions.length === 0) {
    return { error: "Nothing to reorder" };
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  for (const { id, position } of positions) {
    const { error } = await supabase
      .from("collection_cards")
      .update({ position })
      .eq("id", id)
      .eq("collection_id", collectionId);
    if (error) return { error: error.message };
  }

  revalidatePath(`/collections/${collectionId}`);
  return { ok: true };
}
