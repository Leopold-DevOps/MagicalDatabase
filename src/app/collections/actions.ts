"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COLLECTION_TYPES, type CollectionType } from "@/lib/collections";
import { supabaseServer } from "@/lib/supabase/server";

function field(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createCollection(formData: FormData): Promise<void> {
  const name = field(formData, "name");
  const type = field(formData, "type") as CollectionType;
  const description = field(formData, "description") || null;

  if (!name) redirect("/collections/new?error=name");
  if (!COLLECTION_TYPES.includes(type)) redirect("/collections/new?error=type");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/collections/new");

  const { data, error } = await supabase
    .from("collections")
    .insert({ name, type, description, user_id: user.id })
    .select("id")
    .single();

  if (error) redirect("/collections/new?error=db");

  revalidatePath("/collections");
  redirect(`/collections/${data!.id}`);
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
  const { error } = await supabase.from("collection_cards").insert({
    collection_id: collectionId,
    scryfall_id: scryfallId,
    card_name: cardName,
    set_code: setCode,
    set_name: setName,
    image_url: imageUrl,
    quantity,
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
