"use client";

import { useMemo, useState, useTransition } from "react";
import { importDecklist } from "@/app/collections/actions";
import type { CollectionCard, CollectionType } from "@/lib/collections";
import {
  DECKLIST_FORMAT_LABEL,
  formatFor,
  type DecklistFormat,
  type FormatItem,
} from "@/lib/decklist";

type Tab = "export" | "import";

const FORMAT_OPTIONS_DECK: DecklistFormat[] = ["mtgo", "mtga", "csv"];
const FORMAT_OPTIONS_OTHER: DecklistFormat[] = ["csv", "mtgo"];

const COLLECTION_TYPE_NOUN: Record<CollectionType, string> = {
  binder: "binder",
  bulk: "bulk box",
  deck: "deck",
};

export function ImportExportPanel({
  collectionId,
  type,
  cards,
}: {
  collectionId: string;
  type: CollectionType;
  cards: CollectionCard[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full text-sm"
      >
        ⇅ Import / Export
      </button>
    );
  }

  return (
    <Panel
      collectionId={collectionId}
      type={type}
      cards={cards}
      onClose={() => setOpen(false)}
    />
  );
}

function Panel({
  collectionId,
  type,
  cards,
  onClose,
}: {
  collectionId: string;
  type: CollectionType;
  cards: CollectionCard[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("export");
  const formatOptions =
    type === "deck" ? FORMAT_OPTIONS_DECK : FORMAT_OPTIONS_OTHER;

  return (
    <div className="surface flex flex-col gap-4 p-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Tab active={tab === "export"} onClick={() => setTab("export")}>
            Export
          </Tab>
          <Tab active={tab === "import"} onClick={() => setTab("import")}>
            Import
          </Tab>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-lg leading-none text-ink-500 transition hover:text-ink-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {tab === "export" ? (
        <ExportTab cards={cards} type={type} formatOptions={formatOptions} />
      ) : (
        <ImportTab collectionId={collectionId} type={type} />
      )}
    </div>
  );
}

function Tab({
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
      className={`rounded-md border px-3 py-1 text-sm transition ${
        active
          ? "border-violet-400 bg-violet-500/15 text-white"
          : "border-ink-700 text-ink-300 hover:border-violet-400/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ExportTab({
  cards,
  type,
  formatOptions,
}: {
  cards: CollectionCard[];
  type: CollectionType;
  formatOptions: DecklistFormat[];
}) {
  const [format, setFormat] = useState<DecklistFormat>(formatOptions[0]!);
  const [copied, setCopied] = useState(false);

  const items: FormatItem[] = useMemo(
    () =>
      cards.map((c) => ({
        qty: c.quantity ?? 1,
        name: c.card_name,
        set: c.set_code,
        collectorNumber: undefined,
        foil: c.is_foil,
        isCommander: type === "deck" ? c.is_commander : false,
      })),
    [cards, type],
  );

  const text = useMemo(() => formatFor(format, items), [format, items]);

  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  function download() {
    const ext = format === "csv" ? "csv" : "txt";
    const blob = new Blob([text], {
      type: format === "csv" ? "text/csv" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${COLLECTION_TYPE_NOUN[type]}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (cards.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-ink-500">
        Nothing to export — this {COLLECTION_TYPE_NOUN[type]} is empty.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="uppercase tracking-wider text-ink-500">Format</span>
        <div className="flex items-center gap-1">
          {formatOptions.map((f) => (
            <Tab key={f} active={format === f} onClick={() => setFormat(f)}>
              {DECKLIST_FORMAT_LABEL[f]}
            </Tab>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="btn-ghost py-1 px-3 text-xs"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            type="button"
            onClick={download}
            className="btn-primary py-1 px-3 text-xs"
          >
            Download
          </button>
        </div>
      </div>

      <textarea
        readOnly
        value={text}
        className="input-field h-64 w-full resize-y font-mono text-xs leading-relaxed"
      />
    </div>
  );
}

function ImportTab({
  collectionId,
  type,
}: {
  collectionId: string;
  type: CollectionType;
}) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [result, setResult] = useState<
    | { kind: "ok"; added: number; matched: number; notFound: string[]; unparsed: string[] }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    if (
      replace &&
      !window.confirm(
        "Replace every card currently in this collection with the imported list? This can't be undone.",
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const r = await importDecklist(collectionId, text, {
        allowCommander: type === "deck",
        replace,
      });
      if ("error" in r) {
        setResult({ kind: "error", message: r.error });
      } else {
        setResult({
          kind: "ok",
          added: r.summary.added,
          matched: r.summary.matched,
          notFound: r.summary.notFound,
          unparsed: r.summary.unparsed,
        });
        if (r.summary.notFound.length === 0 && r.summary.unparsed.length === 0) {
          setText("");
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-400">
        Paste a list. We auto-detect MTGO plain text (
        <code className="rounded bg-ink-900/80 px-1 text-[11px] text-ink-200">
          4 Lightning Bolt
        </code>
        ), MTG Arena (
        <code className="rounded bg-ink-900/80 px-1 text-[11px] text-ink-200">
          4 Lightning Bolt (M21) 162
        </code>
        ), and CSV.
        {type === "deck" && (
          <>
            {" "}
            A line reading <code className="text-ink-200">Commander:</code>{" "}
            marks the next card as the deck&apos;s commander.
          </>
        )}
      </p>

      {/* Append / Replace segmented control — at the top so the choice is
          made before the user pastes anything. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-ink-500">
          Mode
        </span>
        <div className="inline-flex rounded-md border border-ink-700 p-0.5">
          <button
            type="button"
            onClick={() => setReplace(false)}
            disabled={isPending}
            className={`rounded px-3 py-1 text-xs transition disabled:opacity-50 ${
              !replace
                ? "bg-violet-500/20 font-medium text-violet-100 ring-1 ring-violet-400/40"
                : "text-ink-400 hover:text-ink-100"
            }`}
          >
            Append
          </button>
          <button
            type="button"
            onClick={() => setReplace(true)}
            disabled={isPending}
            className={`rounded px-3 py-1 text-xs transition disabled:opacity-50 ${
              replace
                ? "bg-rose-500/20 font-medium text-rose-200 ring-1 ring-rose-400/50"
                : "text-ink-400 hover:text-ink-100"
            }`}
          >
            Replace
          </button>
        </div>
        {replace ? (
          <span className="text-[11px] text-rose-300/90">
            Wipes the current collection first.
          </span>
        ) : (
          <span className="text-[11px] text-ink-500">
            Merges into existing tray stacks.
          </span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          type === "deck"
            ? "4 Lightning Bolt\n2 Counterspell\n\nCommander:\n1 Atraxa, Praetors' Voice"
            : "4 Lightning Bolt\n1 Black Lotus"
        }
        className="input-field h-48 w-full resize-y font-mono text-xs leading-relaxed"
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !text.trim()}
          className={`py-1 px-4 text-xs disabled:opacity-50 ${
            replace
              ? "rounded-md border border-rose-400/50 bg-rose-500/15 font-medium text-rose-200 transition hover:bg-rose-500/25"
              : "btn-primary"
          }`}
        >
          {isPending
            ? "Importing…"
            : replace
              ? "Replace & import"
              : "Import"}
        </button>
      </div>

      {result && result.kind === "error" && (
        <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {result.message}
        </p>
      )}

      {result && result.kind === "ok" && (
        <div className="flex flex-col gap-2 rounded-md border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
          <p>
            Added <span className="font-semibold">{result.added}</span> card
            {result.added === 1 ? "" : "s"}{" "}
            <span className="text-ink-400">
              ({result.matched} unique matched)
            </span>
            .
          </p>
          {result.notFound.length > 0 && (
            <details className="text-rose-300">
              <summary className="cursor-pointer">
                {result.notFound.length} not found
              </summary>
              <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-ink-950/60 p-2 font-mono text-[11px]">
                {result.notFound.join("\n")}
              </pre>
            </details>
          )}
          {result.unparsed.length > 0 && (
            <details className="text-amber-300">
              <summary className="cursor-pointer">
                {result.unparsed.length} unparsed line
                {result.unparsed.length === 1 ? "" : "s"}
              </summary>
              <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-ink-950/60 p-2 font-mono text-[11px]">
                {result.unparsed.join("\n")}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
