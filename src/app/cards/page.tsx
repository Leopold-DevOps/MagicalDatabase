import Link from "next/link";
import Image from "next/image";
import { SearchBar } from "@/components/SearchBar";
import {
  ScryfallError,
  searchCards,
  smallImage,
  type ScryfallCard,
} from "@/lib/scryfall";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function CardsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const query = q.trim();

  return (
    <div className="flex flex-col gap-8">
      <div className="card-frame p-6">
        <h1 className="font-display text-3xl text-arcane-100">Card search</h1>
        <p className="mt-1 text-sm text-arcane-200/70">
          Powered by Scryfall. Try simple names or full syntax like{" "}
          <code className="rounded bg-midnight-900/70 px-1.5 py-0.5 text-arcane-200">
            t:dragon c:r cmc&lt;=4
          </code>
          .
        </p>
        <div className="mt-4">
          <SearchBar initial={query} />
        </div>
      </div>

      {query ? (
        <Results query={query} pageNum={pageNum} />
      ) : (
        <p className="text-center text-arcane-200/70">
          Enter a query to begin your divination.
        </p>
      )}
    </div>
  );
}

async function Results({ query, pageNum }: { query: string; pageNum: number }) {
  try {
    const data = await searchCards(query, pageNum);
    if (!data.data.length) {
      return (
        <p className="text-center text-arcane-200/70">No cards found.</p>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-arcane-300/70">
          {data.total_cards
            ? `${data.total_cards.toLocaleString()} cards`
            : `${data.data.length} cards`}
          {" — page "}
          {pageNum}
        </p>
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.data.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </ul>
        <Pager
          query={query}
          pageNum={pageNum}
          hasMore={data.has_more}
          hasPrev={pageNum > 1}
        />
      </div>
    );
  } catch (err) {
    if (err instanceof ScryfallError && err.status === 404) {
      return (
        <p className="text-center text-arcane-200/70">
          No cards matched <span className="text-arcane-100">{query}</span>.
        </p>
      );
    }
    return (
      <p className="text-center text-rose-300">
        The arcane channels failed: {(err as Error).message}
      </p>
    );
  }
}

function CardTile({ card }: { card: ScryfallCard }) {
  const img = smallImage(card);
  return (
    <li>
      <Link
        href={`/cards/${card.id}`}
        className="group block overflow-hidden rounded-2xl border border-arcane-800/60 bg-midnight-800/40 transition hover:border-arcane-400 hover:shadow-glow"
      >
        <div className="relative aspect-[5/7] w-full bg-midnight-900">
          {img ? (
            <Image
              src={img}
              alt={card.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid h-full place-items-center text-arcane-300/70">
              {card.name}
            </div>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="truncate text-sm text-arcane-100">{card.name}</p>
          <p className="truncate text-xs text-arcane-300/70">
            {card.set_name ?? card.set?.toUpperCase()}
          </p>
        </div>
      </Link>
    </li>
  );
}

function Pager({
  query,
  pageNum,
  hasMore,
  hasPrev,
}: {
  query: string;
  pageNum: number;
  hasMore: boolean;
  hasPrev: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      {hasPrev ? (
        <Link
          className="btn-arcane"
          href={`/cards?q=${encodeURIComponent(query)}&page=${pageNum - 1}`}
        >
          ← Prev
        </Link>
      ) : null}
      {hasMore ? (
        <Link
          className="btn-arcane"
          href={`/cards?q=${encodeURIComponent(query)}&page=${pageNum + 1}`}
        >
          Next →
        </Link>
      ) : null}
    </div>
  );
}
