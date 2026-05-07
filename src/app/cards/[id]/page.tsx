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

export const dynamic = "force-dynamic";

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
    <div className="flex flex-col gap-8">
      <div className="text-sm text-arcane-300/70">
        <Link href="/cards" className="hover:text-arcane-100">
          ← Back to search
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="card-frame overflow-hidden">
          <div className="relative aspect-[5/7] w-full bg-midnight-900">
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
              <div className="grid h-full place-items-center text-arcane-300/70">
                {card.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <header>
            <h1 className="font-display text-4xl text-arcane-50">{card.name}</h1>
            <p className="mt-1 text-arcane-300">
              {card.set_name}{" "}
              {card.collector_number ? `· #${card.collector_number}` : ""}
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
    <section className="card-frame p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-arcane-100">{face.name}</h2>
        {face.mana_cost ? (
          <span className="text-arcane-200">{face.mana_cost}</span>
        ) : null}
      </div>
      {face.type_line ? (
        <p className="mt-1 text-sm text-arcane-200/80">{face.type_line}</p>
      ) : null}
      {face.oracle_text ? (
        <p className="mt-3 whitespace-pre-line text-arcane-100/90">
          {face.oracle_text}
        </p>
      ) : null}
      {face.flavor_text ? (
        <p className="mt-3 italic text-arcane-200/70">{face.flavor_text}</p>
      ) : null}
      {(face.power || face.toughness || face.loyalty) && (
        <p className="mt-3 text-sm text-arcane-200">
          {face.power && face.toughness
            ? `P/T: ${face.power}/${face.toughness}`
            : ""}
          {face.loyalty ? `Loyalty: ${face.loyalty}` : ""}
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
    <section className="card-frame grid gap-4 p-5 sm:grid-cols-2">
      <Stat label="Released">{card.released_at ?? "—"}</Stat>
      <Stat label="Artist">{card.artist ?? "—"}</Stat>
      <Stat label="USD">{price ?? "—"}</Stat>
      <Stat label="CMC">
        {typeof card.cmc === "number" ? String(card.cmc) : "—"}
      </Stat>
      {legalEntries.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs uppercase tracking-widest text-arcane-300/70">
            Legal in
          </p>
          <div className="flex flex-wrap gap-2">
            {legalEntries.map(([format]) => (
              <span
                key={format}
                className="rounded-full border border-arcane-700/60 px-3 py-1 text-xs text-arcane-200"
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
            className="text-sm text-arcane-300 underline-offset-2 hover:text-white hover:underline"
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
      <p className="text-xs uppercase tracking-widest text-arcane-300/70">
        {label}
      </p>
      <p className="mt-0.5 text-arcane-100">{children}</p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
