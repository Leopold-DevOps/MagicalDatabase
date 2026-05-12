import Link from "next/link";
import { redirect } from "next/navigation";
import {
  COLLECTION_COLOR_GRADIENT,
  COLLECTION_TYPE_LABEL,
  isCollectionColor,
  type Collection,
  type CollectionColor,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CollectionsPage() {
  if (!supabaseConfigured()) {
    return (
      <div className="surface mx-auto max-w-md p-6 text-center">
        <h1 className="font-display text-2xl text-ink-50">
          Supabase not configured
        </h1>
        <p className="mt-2 text-sm text-ink-400">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use
          collections.
        </p>
      </div>
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/collections");

  const { data: collections, error } = await supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-50">Your collections</h1>
          <p className="mt-1 text-sm text-ink-400">
            Organize your cards into binders, bulk, and decks.
          </p>
        </div>
        <Link href="/collections/new" className="btn-primary">
          + New collection
        </Link>
      </header>

      {error && (
        <p className="rounded-md border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-300">
          {error.message}
        </p>
      )}

      {collections && collections.length > 0 ? (
        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(collections as Collection[]).map((c) => (
            <li key={c.id}>
              <CollectionCard collection={c} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="surface p-10 text-center">
          <p className="text-ink-300">No collections yet.</p>
          <Link href="/collections/new" className="btn-primary mt-4">
            Create your first
          </Link>
        </div>
      )}
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const chip =
    collection.type === "binder"
      ? "chip-gold"
      : collection.type === "deck"
        ? "chip-violet"
        : "chip-rose";
  const color: CollectionColor = isCollectionColor(collection.color)
    ? collection.color
    : "arcane";
  const cover = collection.cover_image_url;
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="surface group block overflow-hidden transition hover:border-violet-400/40 hover:shadow-glow"
    >
      {cover ? (
        <div className="relative h-28 w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
            style={{ backgroundImage: `url(${cover})` }}
            aria-hidden
          />
          <div
            className={`absolute inset-0 bg-gradient-to-br opacity-50 mix-blend-overlay ${COLLECTION_COLOR_GRADIENT[color]}`}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-ink-950/30 to-ink-950/80"
            aria-hidden
          />
        </div>
      ) : (
        <div
          className={`h-2 w-full bg-gradient-to-r ${COLLECTION_COLOR_GRADIENT[color]}`}
          aria-hidden
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-50">
            {collection.name}
          </h2>
          <span className={chip}>
            {COLLECTION_TYPE_LABEL[collection.type]}
          </span>
        </div>
        {collection.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-ink-400">
            {collection.description}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-ink-500">No description</p>
        )}
        <p className="mt-3 text-xs text-ink-500">
          Created {new Date(collection.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
