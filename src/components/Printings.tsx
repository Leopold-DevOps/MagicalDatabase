import Image from "next/image";
import Link from "next/link";
import {
  getPrints,
  smallImage,
  type ScryfallCard,
} from "@/lib/scryfall";

export async function Printings({ card }: { card: ScryfallCard }) {
  let prints: ScryfallCard[] = [];
  try {
    prints = await getPrints(card);
  } catch {
    return null;
  }

  const others = prints.filter((p) => p.id !== card.id);
  if (others.length === 0) return null;

  return (
    <section className="surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
          Other printings
        </h2>
        <span className="text-xs text-ink-500">{others.length} arts</span>
      </div>
      <ul className="stagger mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {others.slice(0, 24).map((p) => (
          <li key={p.id}>
            <PrintTile print={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PrintTile({ print }: { print: ScryfallCard }) {
  const img =
    print.image_uris?.small ??
    print.card_faces?.[0]?.image_uris?.small ??
    smallImage(print);
  return (
    <Link
      href={`/cards/${print.id}`}
      className="group block overflow-hidden rounded-lg border border-ink-700/60 bg-ink-950 transition hover:border-violet-400/50 hover:shadow-glow"
      title={`${print.set_name} · ${print.collector_number ?? ""}${print.artist ? ` · ${print.artist}` : ""}`}
    >
      <div className="relative aspect-[5/7] w-full">
        {img ? (
          <Image
            src={img}
            alt={`${print.name} (${print.set_name})`}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 140px"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-center text-[10px] text-ink-400">
            {print.set_name}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-[11px] uppercase tracking-wide text-ink-300">
          {print.set?.toUpperCase()}
        </p>
        <p className="truncate text-[10px] text-ink-500">
          {print.artist ?? ""}
        </p>
      </div>
    </Link>
  );
}

export function PrintingsSkeleton() {
  return (
    <section className="surface p-5">
      <div className="skeleton h-3.5 w-32" />
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-ink-700/60 bg-ink-900/40"
          >
            <div className="skeleton aspect-[5/7] w-full rounded-none" />
            <div className="space-y-1.5 px-2 py-1.5">
              <div className="skeleton h-2.5 w-2/3" />
              <div className="skeleton h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
