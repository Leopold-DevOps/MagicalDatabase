"use client";

import Link from "next/link";
import { useState } from "react";
import { BinderView } from "@/components/binder/BinderView";
import { CardGrid } from "@/components/CardGrid";
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
  isOwner = true,
}: {
  collectionId: string;
  type: CollectionType;
  cards: CollectionCard[];
  rawSettings: unknown;
  isOwner?: boolean;
}) {
  const isBinder = type === "binder";
  const settings: BinderSettings = normalizeBinderSettings(rawSettings);
  const [view, setView] = useState<ViewMode>(isBinder ? "binder" : "grid");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs">
        {isBinder && (
          <>
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
          </>
        )}
        <span className="ml-auto text-ink-500">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
      </div>

      {isBinder && view === "binder" ? (
        <BinderView
          collectionId={collectionId}
          initialCards={cards}
          initialSettings={settings}
          isOwner={isOwner}
        />
      ) : cards.length === 0 ? (
        <EmptyState isOwner={isOwner} />
      ) : (
        <CardGrid cards={cards} isOwner={isOwner} />
      )}
    </div>
  );
}

function EmptyState({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="surface p-10 text-center">
      <p className="text-ink-300">This collection is empty.</p>
      {isOwner && (
        <Link href="/cards" className="btn-primary mt-4">
          Find cards to add
        </Link>
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
