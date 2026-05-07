import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCard,
  primaryImage,
  ScryfallError,
  type ScryfallCard,
  type ScryfallCardFace,
} from "@/lib/scryfall";

type Params = Promise<{ id: string }>;

export default async function CardDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  let card: ScryfallCard;
  try {
    card = await getCard(id);
  } catch (err) {
    if (err instanceof ScryfallError && err.status === 404) notFound();
    throw err;
  }

  const faces: ScryfallCardFace[] =
    card.card_faces && card.card_faces.length > 1
      ? card.card_faces
      : [
          {
            name: card.name,
            type_line: card.type_line,
            oracle_text: card.oracle_text,
            mana_cost: card.mana_cost,
            power: card.power,
            toughness: card.toughness,
            loyalty: card.loyalty,
            flavor_text: card.flavor_text,
            image_uris: card.image_uris,
          },
        ];

  const heroImg = primaryImage(card);

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="text-sm text-ink-400">
        <Link
          href="/cards"
          className="inline-flex items-center gap-1 transition hover:text-ink-100"
        >
          <span aria-hidden>←</span> Back to search
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="surface overflow-hidden">
          <div className="relative aspect-[5/7] w-full bg-ink-950">
            {heroImg ? (
              <Image
                src={heroImg}
                alt={card.name}
                fill
                sizes="(max-width: 768px) 80vw, 360px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="grid h-full place-items-center text-ink-400">
                {card.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <header>
            <h1 className="font-display text-3xl text-ink-50">{card.name}</h1>
            <p className="mt-1 text-sm text-ink-400">
              {card.set_name}
              {card.collector_number ? ` · #${card.collector_number}` : ""}
              {card.rarity ? ` · ${capitalize(card.rarity)}` : ""}
            </p>
          </header>

          <div className="grid gap-4">
            {faces.map((face, idx) => (
              <FaceBlock key={idx} face={face} />
            ))}
          </div>

          <Meta card={card} />
        </div>
      </div>
    </div>
  );
}

function FaceBlock({ face }: { face: ScryfallCardFace }) {
  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink-50">{face.name}</h2>
        {face.mana_cost ? (
          <span className="text-sm text-ink-300">{face.mana_cost}</span>
        ) : null}
      </div>
      {face.type_line ? (
        <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">
          {face.type_line}
        </p>
      ) : null}
      {face.oracle_text ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-200">
          {face.oracle_text}
        </p>
      ) : null}
      {face.flavor_text ? (
        <p className="mt-3 border-l-2 border-ink-800 pl-3 text-sm italic text-ink-400">
          {face.flavor_text}
        </p>
      ) : null}
      {(face.power || face.toughness || face.loyalty) && (
        <p className="mt-3 text-sm font-medium text-ink-200">
          {face.power && face.toughness
            ? `${face.power} / ${face.toughness}`
            : ""}
          {face.loyalty ? `Loyalty ${face.loyalty}` : ""}
        </p>
      )}
    </section>
  );
}

function Meta({ card }: { card: ScryfallCard }) {
  const price = card.prices?.usd
    ? `$${card.prices.usd}`
    : card.prices?.usd_foil
      ? `$${card.prices.usd_foil} (foil)`
      : null;

  const legalEntries = card.legalities
    ? Object.entries(card.legalities).filter(([, v]) => v === "legal")
    : [];

  return (
    <section className="surface grid gap-4 p-5 sm:grid-cols-2">
      <Stat label="Released">{card.released_at ?? "—"}</Stat>
      <Stat label="Artist">{card.artist ?? "—"}</Stat>
      <Stat label="USD">{price ?? "—"}</Stat>
      <Stat label="CMC">
        {typeof card.cmc === "number" ? String(card.cmc) : "—"}
      </Stat>
      {legalEntries.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-500">
            Legal in
          </p>
          <div className="flex flex-wrap gap-1.5">
            {legalEntries.map(([format]) => (
              <span
                key={format}
                className="rounded-md border border-ink-800 px-2 py-0.5 text-xs text-ink-300"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      )}
      {card.scryfall_uri && (
        <div className="sm:col-span-2">
          <a
            href={card.scryfall_uri}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
          >
            View on Scryfall ↗
          </a>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-100">{children}</p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
