import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AddCardsPanel } from "@/components/AddCardsPanel";
import { BulkView, BulkViewSkeleton } from "@/components/bulk/BulkView";
import { CollectionDetailView } from "@/components/CollectionDetailView";
import {
  CollectionValue,
  CollectionValueSkeleton,
} from "@/components/CollectionValue";
import { DeckBoard, DeckBoardSkeleton } from "@/components/DeckBoard";
import { ImportExportPanel } from "@/components/ImportExportPanel";
import { ManaCurve, ManaCurveSkeleton } from "@/components/ManaCurve";
import {
  COLLECTION_COLOR_GRADIENT,
  COLLECTION_COLOR_RING,
  COLLECTION_TYPE_BLURB,
  COLLECTION_TYPE_LABEL,
  isCollectionColor,
  type Collection,
  type CollectionCard,
  type CollectionColor,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteCollection } from "../actions";

type Params = Promise<{ id: string }>;

export default async function CollectionDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  if (!supabaseConfigured()) redirect("/collections");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/collections/${id}`);

  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !collection) notFound();

  const { data: cards } = await supabase
    .from("collection_cards")
    .select("*")
    .eq("collection_id", id)
    .order("position", { ascending: true, nullsFirst: false })
    .order("added_at", { ascending: false });

  const c = collection as Collection;
  const items = (cards ?? []) as CollectionCard[];
  const totalQty = items.reduce((acc, x) => acc + (x.quantity ?? 1), 0);

  const chip =
    c.type === "binder"
      ? "chip-gold"
      : c.type === "deck"
        ? "chip-violet"
        : "chip-rose";
  const color: CollectionColor = isCollectionColor(c.color)
    ? c.color
    : "arcane";

  return (
    <div className="flex flex-col gap-8">
      <div className="text-sm text-ink-400">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1 transition hover:text-ink-100"
        >
          <span aria-hidden>←</span> All collections
        </Link>
      </div>

      <header
        className={`surface relative overflow-hidden ${COLLECTION_COLOR_RING[color]}`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br opacity-80 ${COLLECTION_COLOR_GRADIENT[color]}`}
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-transparent to-ink-900/95"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 pt-24">
          <div>
            <span className={chip}>{COLLECTION_TYPE_LABEL[c.type]}</span>
            <h1 className="mt-2 font-display text-3xl text-ink-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {c.name}
            </h1>
            <p className="mt-1 text-sm text-ink-300">
              {c.description ?? COLLECTION_TYPE_BLURB[c.type]}
            </p>
            <p className="mt-3 text-xs text-ink-400">
              {items.length} unique · {totalQty} total · created{" "}
              {new Date(c.created_at).toLocaleDateString()}
            </p>
            <div className="mt-1">
              <Suspense fallback={<CollectionValueSkeleton />}>
                <CollectionValue cards={items} />
              </Suspense>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/collections/${c.id}/edit`} className="btn-ghost">
              Edit
            </Link>
            <form action={deleteCollection}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="btn-ghost text-rose-300 hover:border-rose-400/40"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </header>

      {c.type === "deck" && (
        <Suspense fallback={<ManaCurveSkeleton />}>
          <ManaCurve cards={items} />
        </Suspense>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AddCardsPanel collectionId={c.id} />
        <ImportExportPanel
          collectionId={c.id}
          type={c.type}
          cards={items}
        />
      </div>

      {c.type === "deck" ? (
        <Suspense fallback={<DeckBoardSkeleton />}>
          <DeckBoard
            collectionId={c.id}
            cards={items}
            deckFormat={c.deck_format}
          />
        </Suspense>
      ) : c.type === "bulk" ? (
        <Suspense fallback={<BulkViewSkeleton />}>
          <BulkView cards={items} />
        </Suspense>
      ) : (
        <CollectionDetailView
          collectionId={c.id}
          type={c.type}
          cards={items}
          rawSettings={c.binder_settings}
        />
      )}
    </div>
  );
}
