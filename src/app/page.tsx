import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="relative overflow-hidden rounded-3xl border border-arcane-700/40 bg-midnight-800/40 px-8 py-20 text-center shadow-glow-lg">
        <div className="pointer-events-none absolute inset-0 bg-arcane-radial" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[0.4em] text-arcane-300">
            A grimoire for planeswalkers
          </p>
          <h1 className="font-display text-5xl leading-tight text-arcane-50 md:text-6xl">
            Search every card in the
            <span className="block bg-gradient-to-r from-arcane-300 via-arcane-400 to-arcane-200 bg-clip-text text-transparent">
              multiverse
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-arcane-200/80">
            Magical Database is a fast, purple-tinged front end for Scryfall.
            Search by name, color, type, or set — and unfurl the lore behind
            each card.
          </p>

          <div className="mx-auto mt-10 max-w-xl">
            <SearchBar autoFocus />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="text-arcane-300/70">Try:</span>
            {["Black Lotus", "Sol Ring", "Lightning Bolt", "Liliana"].map(
              (q) => (
                <Link
                  key={q}
                  href={`/cards?q=${encodeURIComponent(q)}`}
                  className="rounded-full border border-arcane-700/60 px-3 py-1 text-arcane-200 transition hover:border-arcane-400 hover:text-white"
                >
                  {q}
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Powerful search",
            body: "Use Scryfall syntax like `c:blue t:instant cmc<=2` to find exactly what you need.",
          },
          {
            title: "Beautiful detail",
            body: "Inspect oracle text, rulings, prices, and printings on a focused card page.",
          },
          {
            title: "Soon: collections",
            body: "Save decks and wishlists once we wire up the planar vault.",
          },
        ].map((f) => (
          <div key={f.title} className="card-frame p-6">
            <h3 className="font-display text-lg text-arcane-100">{f.title}</h3>
            <p className="mt-2 text-sm text-arcane-200/80">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
