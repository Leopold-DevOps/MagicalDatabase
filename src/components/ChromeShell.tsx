"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { UserMenu } from "@/components/UserMenu";

/**
 * Site chrome (header + footer) wrapper. On the home page (/) we hide
 * everything so the hero gets a clean single-card layout — the home
 * page embeds its own minimal logo + nav inline near the search.
 *
 * Client component so we can read pathname without making the root
 * layout dynamic. Header / footer are not interactive — they just
 * use Link which is fine in a client tree.
 */
export function ChromeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/";

  if (bare) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-ink-700/50 py-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 via-violet-500 to-violet-700 text-sm font-semibold text-gold-200 shadow-glow ring-1 ring-gold-300/30 transition group-hover:from-violet-300 group-hover:to-violet-600 group-hover:text-gold-100 group-hover:ring-gold-300/60"
          >
            ✦
          </span>
          <span className="font-display text-lg tracking-wide text-ink-50 transition group-hover:text-white">
            Magical Database
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-ink-300">
          <Link href="/cards" className="transition hover:text-white">
            Cards
          </Link>
          <Link href="/browse" className="transition hover:text-white">
            Browse
          </Link>
          <Link href="/collections" className="transition hover:text-white">
            Collections
          </Link>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </nav>
      </header>

      <main className="flex-1 py-10">{children}</main>

      <footer className="border-t border-ink-700/50 py-6 text-center text-xs text-ink-500">
        Card data from{" "}
        <a
          href="https://scryfall.com"
          target="_blank"
          rel="noreferrer"
          className="text-ink-300 underline-offset-2 hover:text-white hover:underline"
        >
          Scryfall
        </a>
        . Magic: The Gathering is © Wizards of the Coast. Unofficial.
      </footer>
    </div>
  );
}
