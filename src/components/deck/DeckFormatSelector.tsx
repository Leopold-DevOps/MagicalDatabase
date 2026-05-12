"use client";

import { useTransition } from "react";
import { setDeckFormat } from "@/app/collections/actions";
import { DECK_FORMAT_INFO, DECK_FORMATS, type DeckFormat } from "@/lib/deck";

export function DeckFormatSelector({
  collectionId,
  current,
}: {
  collectionId: string;
  current: DeckFormat;
}) {
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as DeckFormat;
    if (next === current) return;
    startTransition(async () => {
      await setDeckFormat(collectionId, next);
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="uppercase tracking-wider text-ink-500">Format</span>
      <select
        value={current}
        onChange={onChange}
        disabled={isPending}
        className="input-field w-auto py-1 text-xs disabled:opacity-50"
        aria-label="Deck format"
      >
        {DECK_FORMATS.map((f) => (
          <option key={f} value={f}>
            {DECK_FORMAT_INFO[f].label}
            {DECK_FORMAT_INFO[f].limit ? ` (${DECK_FORMAT_INFO[f].limit})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
