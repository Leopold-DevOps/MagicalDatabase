"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  autoFocus = false,
  initial = "",
}: {
  autoFocus?: boolean;
  initial?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/cards?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the multiverse… (e.g. Lightning Bolt, c:blue t:instant)"
        className="input-arcane"
        aria-label="Search cards"
      />
      <button type="submit" className="btn-arcane">
        Search
      </button>
    </form>
  );
}
