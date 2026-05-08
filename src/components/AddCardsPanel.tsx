"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { addCardToCollection } from "@/app/collections/actions";

type Result = {
  id: string;
  name: string;
  set?: string;
  set_name?: string;
  image_uris?: { small?: string; normal?: string };
  card_faces?: { image_uris?: { small?: string; normal?: string } }[];
};

function thumb(card: Result): string | undefined {
  return card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small;
}

function normalImg(card: Result): string | undefined {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
}

export function AddCardsPanel({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full text-sm"
      >
        + Add cards
      </button>
    );
  }

  return <Panel collectionId={collectionId} onClose={() => setOpen(false)} />;
}

function Panel({
  collectionId,
  onClose,
}: {
  collectionId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [foil, setFoil] = useState(false);
  const [toast, setToast] = useState<Record<string, "ok" | "error">>({});
  const [isPending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(() => {
      setSearching(true);
      fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name&unique=cards`,
      )
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setResults((data.data as Result[]).slice(0, 10)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function add(card: Result) {
    const fd = new FormData();
    fd.append("collection_id", collectionId);
    fd.append("scryfall_id", card.id);
    fd.append("card_name", card.name);
    fd.append("set_code", card.set ?? "");
    fd.append("set_name", card.set_name ?? "");
    fd.append("image_url", normalImg(card) ?? "");
    fd.append("quantity", "1");
    fd.append("is_foil", foil ? "true" : "false");

    startTransition(async () => {
      const result = await addCardToCollection(fd);
      const kind = result?.error ? "error" : "ok";
      setToast((prev) => ({ ...prev, [card.id]: kind }));
      setTimeout(
        () =>
          setToast((prev) => {
            const next = { ...prev };
            delete next[card.id];
            return next;
          }),
        1500,
      );
    });
  }

  return (
    <div className="surface flex flex-col gap-3 p-4 animate-fade-in-up">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-200">Add cards</p>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={foil}
              onChange={(e) => setFoil(e.target.checked)}
              className="accent-amber-400"
            />
            <span className={foil ? "font-medium text-amber-300" : "text-ink-400"}>
              Foil
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              onClose();
            }}
            className="text-lg leading-none text-ink-500 transition hover:text-ink-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Search input */}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Scryfall… e.g. Lightning Bolt"
        className="input-field"
      />

      {/* Status */}
      {searching && (
        <p className="text-center text-xs text-ink-500">Searching…</p>
      )}
      {!searching && query.trim() && results.length === 0 && (
        <p className="text-center text-xs text-ink-500">No cards found.</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul className="divide-y divide-ink-800/50">
          {results.map((card) => {
            const img = thumb(card);
            const state = toast[card.id];
            return (
              <li key={card.id} className="flex items-center gap-3 py-2">
                <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded">
                  {img ? (
                    <Image
                      src={img}
                      alt={card.name}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full rounded bg-ink-800" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-100">{card.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {card.set_name ?? card.set?.toUpperCase()}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => add(card)}
                  className={`shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                    state === "ok"
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-300"
                      : state === "error"
                        ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                        : foil
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-400/20"
                          : "btn-primary py-1 px-3 text-xs"
                  }`}
                >
                  {state === "ok"
                    ? "Added ✓"
                    : state === "error"
                      ? "Error"
                      : foil
                        ? "Add foil"
                        : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
