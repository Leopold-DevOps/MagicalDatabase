import Link from "next/link";
import { Suspense } from "react";
import { CardTile } from "@/components/CardTile";
import { SearchBar } from "@/components/SearchBar";
import { ResultsGridSkeleton } from "@/components/Skeleton";
import { ScryfallError, searchCards } from "@/lib/scryfall";

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
      <div className="surface p-5">
        <h1 className="font-display text-2xl text-ink-50">Card search</h1>
        <p className="mt-1 text-sm text-ink-400">
          Powered by Scryfall. Try{" "}
          <code className="rounded bg-ink-900/80 px-1.5 py-0.5 text-xs text-ink-200">
            t:dragon c:r cmc&lt;=4
          </code>
          .
        </p>
        <div className="mt-4">
          <SearchBar initial={query} />
        </div>
      </div>

      {query ? (
        <Suspense
          key={`${query}-${pageNum}`}
          fallback={<ResultsGridSkeleton />}
        >
          <Results query={query} pageNum={pageNum} />
        </Suspense>
      ) : (
        <p className="py-12 text-center text-ink-500">
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
        <p className="py-12 text-center text-ink-500">No cards found.</p>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-xs text-ink-500">
          <p>
            {data.total_cards
              ? `${data.total_cards.toLocaleString()} results`
              : `${data.data.length} results`}
          </p>
          <p>page {pageNum}</p>
        </div>
        <ul className="stagger grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.data.map((c) => (
            <li key={c.id}>
              <CardTile card={c} />
            </li>
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
        <p className="py-12 text-center text-ink-500">
          No cards matched <span className="text-ink-200">{query}</span>.
        </p>
      );
    }
    return (
      <p className="py-12 text-center text-rose-300">
        Something went wrong: {(err as Error).message}
      </p>
    );
  }
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
  if (!hasPrev && !hasMore) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      {hasPrev ? (
        <Link
          className="btn-ghost"
          href={`/cards?q=${encodeURIComponent(query)}&page=${pageNum - 1}`}
          prefetch
        >
          ← Prev
        </Link>
      ) : null}
      {hasMore ? (
        <Link
          className="btn-primary"
          href={`/cards?q=${encodeURIComponent(query)}&page=${pageNum + 1}`}
          prefetch
        >
          Next →
        </Link>
      ) : null}
    </div>
  );
}
