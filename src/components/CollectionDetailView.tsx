"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { removeCardFromCollection } from "@/app/collections/actions";
import { BinderView } from "@/components/binder/BinderView";
import {
  normalizeBinderSettings,
  type BinderSettings,
} from "@/lib/binder";
import type { CollectionCard, CollectionType } from "@/lib/collections";

type ViewMode = "grid" | "binder";

export function CollectionDetailView({
  collectionId,
  type,
  cards,
  rawSettings,
}: {
  collectionId: string;
  type: CollectionType;
  cards: CollectionCard[];
  rawSettings: unknown;
}) {
  const settings: BinderSettings = normalizeBinderSettings(rawSettings);
  const [view, setView] = useState<ViewMode>(
    type === "binder" ? "binder" : "grid",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs">
        <ViewTab
          active={view === "grid"}
          onClick={() => setView("grid")}
        >
          Grid
        </ViewTab>
        <ViewTab
          active={view === "binder"}
          onClick={() => setView("binder")}
        >
          Binder
        </ViewTab>
        <span className="ml-auto text-ink-500">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
      </div>

      {view === "grid" ? (
        <GridView cards={cards} />
      ) : (
        <BinderView
          collectionId={collectionId}
          initialCards={cards}
          initialSettings={settings}
        />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        active
          ? "border-violet-400 bg-violet-500/15 text-white"
          : "border-ink-700 text-ink-300 hover:border-violet-400/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function GridView({ cards }: { cards: CollectionCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <p className="text-ink-300">This collection is empty.</p>
        <Link href="/cards" className="btn-primary mt-4">
          Find cards to add
        </Link>
      </div>
    );
  }
  return (
    <ul className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((item) => (
        <li key={item.id}>
          <CardEntry item={item} />
        </li>
      ))}
    </ul>
  );
}

function CardEntry({ item }: { item: CollectionCard }) {
  return (
    <div className="surface group overflow-hidden transition hover:border-violet-400/40">
      <Link
        href={`/cards/${item.scryfall_id}`}
        className="block"
        prefetch={false}
      >
        <div className="relative aspect-[5/7] w-full bg-ink-950">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.card_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 220px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-ink-400">
              {item.card_name}
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium text-ink-100">
            {item.card_name}
          </p>
          <p className="truncate text-xs text-ink-500">
            {item.set_name ?? item.set_code?.toUpperCase()}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-ink-700/50 px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="chip">×{item.quantity}</span>
          {item.is_foil && <span className="chip-gold">Foil</span>}
        </div>
        <form action={removeCardFromCollection}>
          <input type="hidden" name="id" value={item.id} />
          <input
            type="hidden"
            name="collection_id"
            value={item.collection_id}
          />
          <button
            type="submit"
            className="btn-subtle text-rose-300 hover:bg-rose-400/10"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
