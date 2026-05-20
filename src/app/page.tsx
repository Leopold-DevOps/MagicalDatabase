import { cookies } from "next/headers";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { ThemeArtCredit } from "@/components/ThemeBackdrop";
import { getTheme, rotatingThemeForDate } from "@/lib/themes";

export default async function HomePage() {
  const store = await cookies();
  const rotate = store.get("theme_rotate")?.value === "1";
  const explicit = store.get("theme")?.value;
  const theme = getTheme(rotate ? rotatingThemeForDate() : explicit);

  // Bare landing — no global chrome. An airy centred hero: glowing
  // wordmark, a focused search, and a couple of quiet nav links.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-[11px] uppercase tracking-[0.4em] text-ink-300/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          A grimoire for planeswalkers
        </p>

        <h1 className="font-display text-6xl leading-[1.02] tracking-tight text-ink-50 drop-shadow-[0_2px_18px_rgba(0,0,0,0.7)] md:text-7xl">
          <span className="title-glow">Magical</span>
          <span className="block text-ink-50">Database</span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-balance text-sm text-ink-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
          Search every card in the multiverse — a fast, modern front end for
          Scryfall.
        </p>

        {/* Search — the focal point. focus-within lifts the glow. */}
        <div className="group mx-auto mt-8 max-w-xl rounded-2xl border border-ink-700/70 bg-ink-950/70 p-2 shadow-soft backdrop-blur-md transition focus-within:border-[color:var(--theme-accent)]/60 focus-within:shadow-[0_0_40px_-8px_var(--theme-accent-soft)]">
          <SearchBar autoFocus />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-ink-300/80">Try</span>
          {["Black Lotus", "Sol Ring", "Lightning Bolt", "Liliana"].map((q) => (
            <Link
              key={q}
              href={`/cards?q=${encodeURIComponent(q)}`}
              className="rounded-md border border-ink-700/70 bg-ink-900/60 px-2.5 py-1 text-ink-200 backdrop-blur-sm transition hover:border-[color:var(--theme-accent)]/60 hover:text-white"
            >
              {q}
            </Link>
          ))}
        </div>

        {/* Quiet nav — the header, distilled to two links. */}
        <nav className="mt-8 flex items-center justify-center gap-6 text-sm text-ink-300">
          <Link href="/browse" className="transition hover:text-white">
            Browse
          </Link>
          <span className="text-ink-700" aria-hidden>
            ·
          </span>
          <Link href="/collections" className="transition hover:text-white">
            Collections
          </Link>
        </nav>

        <div className="mt-10">
          <ThemeArtCredit theme={theme} />
        </div>
      </div>
    </div>
  );
}
