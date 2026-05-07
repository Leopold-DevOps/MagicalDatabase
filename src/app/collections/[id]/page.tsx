import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  COLLECTION_TYPE_BLURB,
  COLLECTION_TYPE_LABEL,
  type Collection,
  type CollectionCard,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteCollection, removeCardFromCollection } from "../actions";

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

      <header className="surface-glow p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className={chip}>{COLLECTION_TYPE_LABEL[c.type]}</span>
            <h1 className="mt-2 font-display text-3xl text-ink-50">{c.name}</h1>
            <p className="mt-1 text-sm text-ink-400">
              {c.description ?? COLLECTION_TYPE_BLURB[c.type]}
            </p>
            <p className="mt-3 text-xs text-ink-500">
              {items.length} unique · {totalQty} total · created{" "}
              {new Date(c.created_at).toLocaleDateString()}
            </p>
          </div>
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
      </header>

      {items.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="text-ink-300">This collection is empty.</p>
          <Link href="/cards" className="btn-primary mt-4">
            Find cards to add
          </Link>
        </div>
      ) : (
        <ul className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <CardEntry item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CardEntry({ item }: { item: CollectionCard }) {
  return (
    <div className="surface group overflow-hidden transition hover:border-violet-400/40">
      <Link
        href={`/cards/${item.scryfall_id}`}
        className="block"
        prefetch={false}
      >
        <div className="relative aspect-[5/7] w-full bg-ink-950">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.card_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 220px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-ink-400">
              {item.card_name}
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium text-ink-100">
            {item.card_name}
          </p>
          <p className="truncate text-xs text-ink-500">
            {item.set_name ?? item.set_code?.toUpperCase()}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-ink-700/50 px-3 py-2">
        <span className="chip">×{item.quantity}</span>
        <form action={removeCardFromCollection}>
          <input type="hidden" name="id" value={item.id} />
          <input
            type="hidden"
            name="collection_id"
            value={item.collection_id}
          />
          <button
            type="submit"
            className="btn-subtle text-rose-300 hover:bg-rose-400/10"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
