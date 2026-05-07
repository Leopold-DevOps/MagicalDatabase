import Link from "next/link";
import { COLLECTION_TYPE_LABEL, type Collection } from "@/lib/collections";
import { primaryImage, type ScryfallCard } from "@/lib/scryfall";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { AddToCollectionForm } from "./AddToCollectionForm";

export async function AddToCollection({ card }: { card: ScryfallCard }) {
  if (!supabaseConfigured()) {
    return (
      <div className="surface p-4 text-sm text-ink-400">
        Collections need Supabase configured.
      </div>
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="surface p-4 text-sm text-ink-300">
        <Link
          href={`/auth/login?next=${encodeURIComponent(`/cards/${card.id}`)}`}
          className="text-violet-300 transition hover:text-white"
        >
          Sign in
        </Link>{" "}
        to add this card to a collection.
      </div>
    );
  }

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, type")
    .order("created_at", { ascending: false });

  const list =
    (collections as Pick<Collection, "id" | "name" | "type">[] | null) ?? [];

  if (list.length === 0) {
    return (
      <div className="surface p-4 text-sm text-ink-300">
        You don&apos;t have any collections yet.{" "}
        <Link
          href="/collections/new"
          className="text-violet-300 transition hover:text-white"
        >
          Create one
        </Link>{" "}
        to start adding cards.
      </div>
    );
  }

  return (
    <AddToCollectionForm
      cardId={card.id}
      cardName={card.name}
      setCode={card.set ?? null}
      setName={card.set_name ?? null}
      imageUrl={primaryImage(card) ?? null}
      collections={list.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        typeLabel: COLLECTION_TYPE_LABEL[c.type],
      }))}
    />
  );
}
