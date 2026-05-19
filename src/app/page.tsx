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

  // Single hero, fits the viewport — no scroll. Backdrop is rendered
  // globally from RootLayout so the theme art sits behind the page.
  return (
    <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-violet-300/80">
          A grimoire for planeswalkers
        </p>
        <h1 className="text-balance font-display text-5xl leading-[1.05] text-ink-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] md:text-6xl">
          Search every card in the
          <span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-violet-300 bg-clip-text pb-2 text-transparent">
            multiverse
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-base text-ink-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
          A fast, modern front end for Scryfall — search, browse, and inspect
          any Magic: The Gathering card.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar autoFocus />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-ink-300">Try</span>
          {["Black Lotus", "Sol Ring", "Lightning Bolt", "Liliana"].map(
            (q) => (
              <Link
                key={q}
                href={`/cards?q=${encodeURIComponent(q)}`}
                className="rounded-md border border-ink-700/70 bg-ink-950/50 px-2.5 py-1 text-xs text-ink-100 backdrop-blur-sm transition hover:border-violet-500/60 hover:text-white"
              >
                {q}
              </Link>
            ),
          )}
        </div>

        <div className="mt-10">
          <ThemeArtCredit theme={theme} />
        </div>
      </div>
    </section>
  );
}
