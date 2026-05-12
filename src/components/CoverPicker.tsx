"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setCollectionCover } from "@/app/collections/actions";
import type { CollectionCard } from "@/lib/collections";

export function CoverPicker({
  collectionId,
  cards,
  currentScryfallId,
  hasCover,
}: {
  collectionId: string;
  cards: CollectionCard[];
  currentScryfallId: string | null;
  hasCover: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Sort the deck's commander to the front so it's always one click away,
  // then current cover, then everything else preserved in insertion order.
  const sortedCards = useMemo(() => {
    const commanders = cards.filter((c) => c.is_commander);
    const rest = cards.filter((c) => !c.is_commander);
    return [...commanders, ...rest];
  }, [cards]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(cardId: string | null) {
    setError(null);
    startTransition(async () => {
      const r = await setCollectionCover(collectionId, cardId);
      if ("error" in r) {
        setError(r.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost"
      >
        {hasCover ? "Change cover" : "Set cover"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm animate-fade-in-up"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose cover card"
            className="surface flex max-h-[80vh] w-full max-w-3xl flex-col gap-4 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl text-ink-50">
                  Choose cover
                </h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  Pick any card from this collection — its artwork becomes the
                  banner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-2xl leading-none text-ink-500 transition hover:text-ink-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && (
              <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            {sortedCards.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">
                This collection has no cards yet. Add one first.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {sortedCards.map((card) => {
                  const isCurrent = card.scryfall_id === currentScryfallId;
                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => pick(card.id)}
                        className={`group relative block w-full overflow-hidden rounded-md ring-1 transition disabled:opacity-50 ${
                          isCurrent
                            ? "ring-2 ring-violet-300 shadow-glow"
                            : card.is_commander
                              ? "ring-amber-400/60 hover:ring-amber-300"
                              : "ring-ink-800/70 hover:ring-violet-400/60"
                        }`}
                        aria-label={`Set ${card.card_name} as cover`}
                      >
                        <div className="relative aspect-[5/7] w-full bg-ink-950">
                          {card.image_url ? (
                            <Image
                              src={card.image_url}
                              alt={card.card_name}
                              fill
                              sizes="(max-width: 640px) 30vw, 130px"
                              className="object-cover transition group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center px-2 text-center text-[10px] text-ink-300">
                              {card.card_name}
                            </div>
                          )}
                        </div>
                        {isCurrent ? (
                          <span className="absolute left-1 top-1 rounded-full bg-violet-500/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                            Current
                          </span>
                        ) : card.is_commander ? (
                          <span className="absolute left-1 top-1 rounded-full bg-amber-500/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-950">
                            Commander
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-1 flex items-center justify-between">
              {hasCover ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => pick(null)}
                  className="btn-ghost text-rose-300 hover:border-rose-400/40 disabled:opacity-50"
                >
                  Remove cover
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
