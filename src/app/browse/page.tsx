import Link from "next/link";
import {
  COLLECTION_COLOR_GRADIENT,
  COLLECTION_TYPE_LABEL,
  COLLECTION_TYPES,
  isCollectionColor,
  type Collection,
  type CollectionColor,
  type CollectionType,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export const revalidate = 60;

type Search = Promise<{ type?: string }>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { type: rawType } = await searchParams;
  const filterType =
    rawType && (COLLECTION_TYPES as readonly string[]).includes(rawType)
      ? (rawType as CollectionType)
      : null;

  if (!supabaseConfigured()) {
    return (
      <div className="surface mx-auto max-w-md p-6 text-center">
        <h1 className="font-display text-2xl text-ink-50">Browse</h1>
        <p className="mt-2 text-sm text-ink-400">
          Supabase isn&apos;t configured.
        </p>
      </div>
    );
  }

  const supabase = await supabaseServer();

  // Fetch public collections, then profiles in a second round-trip and stitch
  // them together client-side. The alternative — a supabase relationship
  // hint — needs an FK from collections.user_id → profiles.user_id, which
  // is awkward because both reference auth.users.
  let q = supabase
    .from("collections")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(120);
  if (filterType) q = q.eq("type", filterType);

  const { data: collections } = await q;
  const rows = (collections ?? []) as Collection[];

  let profilesByUser = new Map<string, string>();
  if (rows.length > 0) {
    const ownerIds = Array.from(new Set(rows.map((c) => c.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", ownerIds);
    profilesByUser = new Map(
      (profiles ?? []).map((p) => [p.user_id as string, p.username as string]),
    );
  }

  // Drop collections whose owner hasn't picked a username — without
  // attribution they don't belong on a discovery surface.
  const tiles = rows.filter((c) => profilesByUser.has(c.user_id));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-50">Browse</h1>
          <p className="mt-1 text-sm text-ink-400">
            Public decks, binders, and bulk boxes shared by other summoners.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5 text-xs">
        <TypeChip current={filterType} value={null} label="All" />
        {COLLECTION_TYPES.map((t) => (
          <TypeChip
            key={t}
            current={filterType}
            value={t}
            label={COLLECTION_TYPE_LABEL[t]}
          />
        ))}
      </nav>

      {tiles.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="text-ink-300">No public collections yet.</p>
          <p className="mt-1 text-xs text-ink-500">
            Mark one of yours public from its Edit page and pick a username
            on /account to appear here.
          </p>
        </div>
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((c) => (
            <li key={c.id}>
              <BrowseTile
                collection={c}
                username={profilesByUser.get(c.user_id) ?? ""}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TypeChip({
  current,
  value,
  label,
}: {
  current: CollectionType | null;
  value: CollectionType | null;
  label: string;
}) {
  const active = current === value;
  const href = value ? `/browse?type=${value}` : "/browse";
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1 transition ${
        active
          ? "border-violet-400 bg-violet-500/15 text-white"
          : "border-ink-700 text-ink-300 hover:border-violet-400/50 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function BrowseTile({
  collection,
  username,
}: {
  collection: Collection;
  username: string;
}) {
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
      className="surface deck-card-pop group flex h-60 flex-col overflow-hidden hover:border-[color:var(--theme-accent)]/40"
    >
      {cover ? (
        <div className="relative h-28 w-full shrink-0 overflow-hidden">
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
          className={`h-2 w-full shrink-0 bg-gradient-to-r ${COLLECTION_COLOR_GRADIENT[color]}`}
          aria-hidden
        />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-1 text-base font-semibold text-ink-50">
            {collection.name}
          </h2>
          <span className={chip}>
            {COLLECTION_TYPE_LABEL[collection.type]}
          </span>
        </div>
        {collection.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-400">
            {collection.description}
          </p>
        )}
        <p className="mt-auto pt-3 text-xs text-ink-500">
          by <span className="text-violet-200">@{username}</span>
        </p>
      </div>
    </Link>
  );
}
