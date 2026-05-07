"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SearchBar({
  autoFocus = false,
  initial = "",
}: {
  autoFocus?: boolean;
  initial?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(() => {
      router.push(`/cards?q=${encodeURIComponent(trimmed)}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search e.g. Lightning Bolt, c:blue t:instant cmc<=2"
          className="input-field pl-9"
          aria-label="Search cards"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
