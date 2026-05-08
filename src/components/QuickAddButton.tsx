"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { addCardToCollection } from "@/app/collections/actions";
import {
  COLLECTION_TYPE_LABEL,
  type CollectionType,
} from "@/lib/collections";

export type QuickAddCollection = {
  id: string;
  name: string;
  type: CollectionType;
};

export type QuickAddCard = {
  scryfall_id: string;
  name: string;
  set_code: string | null;
  set_name: string | null;
  image_url: string | null;
};

export function QuickAddButton({
  card,
  collections,
  isSignedIn,
}: {
  card: QuickAddCard;
  collections: QuickAddCollection[];
  isSignedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Not signed in → button just links to login
  if (!isSignedIn) {
    return (
      <Link
        href={`/auth/login?next=${encodeURIComponent(`/cards/${card.scryfall_id}`)}`}
        onClick={(e) => e.stopPropagation()}
        title="Sign in to save"
        aria-label="Sign in to save"
        className={triggerClass()}
      >
        +
      </Link>
    );
  }

  function add(collection: QuickAddCollection, foil: boolean) {
    setFeedback(null);
    const fd = new FormData();
    fd.append("collection_id", collection.id);
    fd.append("scryfall_id", card.scryfall_id);
    fd.append("card_name", card.name);
    fd.append("set_code", card.set_code ?? "");
    fd.append("set_name", card.set_name ?? "");
    fd.append("image_url", card.image_url ?? "");
    fd.append("quantity", "1");
    fd.append("is_foil", foil ? "true" : "false");

    startTransition(async () => {
      const result = await addCardToCollection(fd);
      if (result?.error) {
        setFeedback({ kind: "error", message: result.error });
      } else if (result?.ok) {
        setFeedback({
          kind: "ok",
          message: `Added${foil ? " foil" : ""} to ${collection.name}`,
        });
        window.setTimeout(() => {
          setOpen(false);
          setFeedback(null);
        }, 1100);
      }
    });
  }

  return (
    <div ref={wrapperRef} className="absolute right-2 top-2 z-10">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Add to collection"
        className={triggerClass(open)}
      >
        {open ? "×" : "+"}
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.preventDefault()}
          className="absolute right-0 top-9 w-60 rounded-lg border border-ink-700/80 bg-ink-950/95 p-2 shadow-soft backdrop-blur animate-fade-in-up"
        >
          {collections.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-ink-400">
              No collections yet.
              <Link
                href="/collections/new"
                className="mt-1.5 block text-violet-300 transition hover:text-white"
              >
                Create your first →
              </Link>
            </div>
          ) : (
            <>
              <p className="px-2 pb-1.5 text-[10px] uppercase tracking-wider text-ink-400">
                Add to
              </p>
              <ul className="space-y-0.5">
                {collections.map((c) => (
                  <li key={c.id}>
                    <CollectionRow
                      collection={c}
                      onAdd={(foil) => add(c, foil)}
                      disabled={isPending}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          {feedback && (
            <p
              className={`mt-1.5 rounded-md px-2 py-1 text-xs ${
                feedback.kind === "ok"
                  ? "border border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border border-rose-400/40 bg-rose-400/10 text-rose-300"
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CollectionRow({
  collection,
  onAdd,
  disabled,
}: {
  collection: QuickAddCollection;
  onAdd: (foil: boolean) => void;
  disabled: boolean;
}) {
  const chip =
    collection.type === "binder"
      ? "chip-gold"
      : collection.type === "deck"
        ? "chip-violet"
        : "chip-rose";
  return (
    <div className="flex items-center gap-1 rounded-md transition hover:bg-violet-500/10">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAdd(false)}
        className="flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-ink-100 disabled:opacity-50"
      >
        <span className="truncate">{collection.name}</span>
        <span className={chip}>{COLLECTION_TYPE_LABEL[collection.type]}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAdd(true)}
        title="Add as foil"
        className="rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-50"
      >
        Foil
      </button>
    </div>
  );
}

function triggerClass(open = false): string {
  return [
    "grid h-7 w-7 place-items-center rounded-full text-base font-semibold transition",
    "bg-ink-950/80 text-violet-200 ring-1 ring-violet-400/40 shadow-md backdrop-blur-sm",
    "hover:bg-violet-500 hover:text-white hover:ring-violet-300",
    open ? "bg-violet-500 text-white ring-violet-300" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
