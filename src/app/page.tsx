import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20">
      <section className="relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-violet-300/80">
            A grimoire for planeswalkers
          </p>
          <h1 className="text-balance font-display text-5xl leading-[1.05] text-ink-50 md:text-6xl">
            Search every card in the
            <span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-violet-300 bg-clip-text pb-2 text-transparent">
              multiverse
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-ink-400">
            A fast, modern front end for Scryfall — search, browse, and inspect
            any Magic: The Gathering card.
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <SearchBar autoFocus />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-ink-500">Try</span>
            {["Black Lotus", "Sol Ring", "Lightning Bolt", "Liliana"].map(
              (q) => (
                <Link
                  key={q}
                  href={`/cards?q=${encodeURIComponent(q)}`}
                  className="rounded-md border border-ink-800 px-2.5 py-1 text-xs text-ink-300 transition hover:border-violet-500/50 hover:text-white"
                >
                  {q}
                </Link>
              ),
            )}
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
