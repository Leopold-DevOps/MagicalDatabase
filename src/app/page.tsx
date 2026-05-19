import { cookies } from "next/headers";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { ThemeArtCredit, ThemeBackdrop } from "@/components/ThemeBackdrop";
import { getTheme, rotatingThemeForDate } from "@/lib/themes";

export default async function HomePage() {
  const store = await cookies();
  const rotate = store.get("theme_rotate")?.value === "1";
  const explicit = store.get("theme")?.value;
  const theme = getTheme(rotate ? rotatingThemeForDate() : explicit);

  return (
    <div className="flex flex-col gap-20">
      {/* Backdrop pins to viewport (fixed inset-0) so the hero art sits
          behind the whole page and parallaxes as the user scrolls. */}
      <ThemeBackdrop theme={theme} />
      <section className="relative py-16 md:py-24">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-violet-300/80">
            A grimoire for planeswalkers
          </p>
          <h1 className="text-balance font-display text-5xl leading-[1.05] text-ink-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] md:text-6xl">
            Search every card in the
            <span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-violet-300 bg-clip-text pb-2 text-transparent">
              multiverse
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-ink-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
            A fast, modern front end for Scryfall — search, browse, and inspect
            any Magic: The Gathering card.
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <SearchBar autoFocus />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-ink-400">Try</span>
            {["Black Lotus", "Sol Ring", "Lightning Bolt", "Liliana"].map(
              (q) => (
                <Link
                  key={q}
                  href={`/cards?q=${encodeURIComponent(q)}`}
                  className="rounded-md border border-ink-700/70 bg-ink-950/40 px-2.5 py-1 text-xs text-ink-200 backdrop-blur-sm transition hover:border-violet-500/60 hover:text-white"
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

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Powerful search",
            body: "Use Scryfall syntax like c:blue t:instant cmc<=2 to narrow exactly what you need.",
          },
          {
            title: "Sharp detail",
            body: "Inspect oracle text, faces, legalities, and pricing on a focused card page.",
          },
          {
            title: "Soon: collections",
            body: "Save decks and wishlists once we wire up the planar vault.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="surface p-5 transition hover:border-ink-700"
          >
            <h3 className="text-sm font-semibold text-ink-100">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-400">
              {f.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
