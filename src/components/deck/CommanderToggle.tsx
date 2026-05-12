"use client";

import { useTransition } from "react";
import { setCommander } from "@/app/collections/actions";

export function CommanderToggle({
  collectionId,
  cardId,
  isCommander,
}: {
  collectionId: string;
  cardId: string;
  isCommander: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await setCommander(collectionId, cardId, !isCommander);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={`rounded-md border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm transition disabled:opacity-50 ${
        isCommander
          ? "border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
          : "border-amber-400/30 bg-ink-950/85 text-amber-200/80 hover:bg-amber-500/15 hover:text-amber-200"
      }`}
    >
      {isCommander ? "Unset commander" : "Set as commander"}
    </button>
  );
}
