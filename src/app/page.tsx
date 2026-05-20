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

  // Bare landing — no global chrome. One floating glass card holds the
  // brand, search, and quick links so everything reads cleanly over
  // the theme backdrop.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="surface-glow rounded-2xl border-ink-700/70 bg-ink-950/70 p-7 backdrop-blur-md sm:p-9">
          {/* Brand + inline nav — the header, distilled */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 via-violet-500 to-violet-700 text-sm font-semibold text-gold-200 shadow-glow ring-1 ring-gold-300/30"
              >
                ✦
              </span>
              <span className="font-display text-base tracking-wide text-ink-50">
                Magical Database
              </span>
            </div>
            <nav className="flex items-center gap-3 text-xs text-ink-300">
              <Link href="/browse" className="transition hover:text-white">
                Browse
              </Link>
              <Link
                href="/collections"
                className="transition hover:text-white"
              >
                Collections
              </Link>
            </nav>
          </div>

          <h1 className="mt-7 text-balance font-display text-3xl leading-tight text-ink-50 sm:text-4xl">
            Search every card in the{" "}
            <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-violet-300 bg-clip-text text-transparent">
              multiverse
            </span>
          </h1>
          <p className="mt-2 text-sm text-ink-300">
            A fast, modern front end for Scryfall.
          </p>

          <div className="mt-6">
            <SearchBar autoFocus />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-400">Try</span>
            {["Black Lotus", "Sol Ring", "Lightning Bolt", "Liliana"].map(
              (q) => (
                <Link
                  key={q}
                  href={`/cards?q=${encodeURIComponent(q)}`}
                  className="rounded-md border border-ink-700/70 bg-ink-900/60 px-2.5 py-1 text-ink-200 transition hover:border-violet-500/60 hover:text-white"
                >
                  {q}
                </Link>
              ),
            )}
          </div>
        </div>

        {/* Art credit — outside the card, subtle */}
        <div className="mt-4 text-center">
          <ThemeArtCredit theme={theme} />
        </div>
      </div>
    </div>
  );
}
