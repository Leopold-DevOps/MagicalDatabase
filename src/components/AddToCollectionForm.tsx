"use client";

import { useState, useTransition } from "react";
import { addCardToCollection } from "@/app/collections/actions";

type CollectionOption = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
};

export function AddToCollectionForm({
  cardId,
  cardName,
  setCode,
  setName,
  imageUrl,
  collections,
}: {
  cardId: string;
  cardName: string;
  setCode: string | null;
  setName: string | null;
  imageUrl: string | null;
  collections: CollectionOption[];
}) {
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addCardToCollection(fd);
      if (result?.error) {
        setFeedback({ kind: "error", message: result.error });
      } else if (result?.ok) {
        const target = collections.find((c) => c.id === collectionId);
        setFeedback({
          kind: "ok",
          message: `Added ×${quantity} to ${target?.name ?? "collection"}.`,
        });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="surface flex flex-col gap-3 p-4"
      aria-label="Add to collection"
    >
      <p className="text-xs uppercase tracking-wider text-ink-400">
        Add to collection
      </p>
      <input type="hidden" name="scryfall_id" value={cardId} />
      <input type="hidden" name="card_name" value={cardName} />
      <input type="hidden" name="set_code" value={setCode ?? ""} />
      <input type="hidden" name="set_name" value={setName ?? ""} />
      <input type="hidden" name="image_url" value={imageUrl ?? ""} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          name="collection_id"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          className="input-field flex-1"
          aria-label="Collection"
        >
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.typeLabel}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="quantity"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Number(e.target.value) || 1))
          }
          className="input-field sm:w-24"
          aria-label="Quantity"
        />
        <button
          type="submit"
          disabled={isPending || !collectionId}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>

      {feedback && (
        <p
          className={
            feedback.kind === "ok"
              ? "rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-xs text-violet-200"
              : "rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-300"
          }
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
