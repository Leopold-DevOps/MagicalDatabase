"use client";

import { useState, useTransition } from "react";
import { setCollectionVisibility } from "@/app/collections/actions";

export function VisibilityToggle({
  collectionId,
  initial,
  hasUsername,
}: {
  collectionId: string;
  initial: boolean;
  hasUsername: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isPublic;
    setError(null);
    setIsPublic(next);
    startTransition(async () => {
      const r = await setCollectionVisibility(collectionId, next);
      if ("error" in r) {
        setError(r.error);
        setIsPublic(!next);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Visibility
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {isPublic
              ? "Anyone with the link can view this collection. " +
                (hasUsername
                  ? "It appears in /browse with your username."
                  : "Set a username on /account to appear in /browse.")
              : "Only you can see this collection."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          role="switch"
          aria-checked={isPublic}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border transition disabled:opacity-50 ${
            isPublic
              ? "border-violet-400/60 bg-violet-500/30"
              : "border-ink-700 bg-ink-800/70"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full transition ${
              isPublic
                ? "translate-x-8 bg-violet-200 shadow-glow"
                : "translate-x-1 bg-ink-400"
            }`}
            aria-hidden
          />
          <span className="sr-only">
            {isPublic ? "Public" : "Private"}
          </span>
        </button>
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
        {isPublic ? (
          <span className="rounded-full border border-violet-400/50 bg-violet-500/15 px-2 py-0.5 text-violet-200">
            Public
          </span>
        ) : (
          <span className="rounded-full border border-ink-700/80 bg-ink-900/70 px-2 py-0.5 text-ink-400">
            Private
          </span>
        )}
        {error && <span className="text-rose-300 normal-case">{error}</span>}
      </div>
    </div>
  );
}
