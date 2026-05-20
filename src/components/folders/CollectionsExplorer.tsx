"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createFolder,
  deleteFolder,
  setCollectionFolder,
  updateFolder,
} from "@/app/collections/actions";
import {
  COLLECTION_COLORS,
  COLLECTION_COLOR_GRADIENT,
  COLLECTION_COLOR_LABEL,
  COLLECTION_TYPE_LABEL,
  isCollectionColor,
  type Collection,
  type CollectionColor,
  type Folder,
} from "@/lib/collections";

export type FolderCoverCard = {
  id: string;
  scryfall_id: string;
  card_name: string;
  image_url: string | null;
};

export type FolderCoverMap = Record<string, FolderCoverCard[]>;

type Props = {
  folders: Folder[];
  collections: Collection[];
  currentFolderId: string | null;
  currentFolderName: string | null;
  parentFolderId: string | null;
  // True if we're at depth 1 (inside a folder); the +Folder button is
  // hidden for deeper-than-one nesting.
  canCreateSubfolder: boolean;
  // Map folder_id → cover candidate cards (own collections + subfolders).
  folderCoverCards: FolderCoverMap;
};

export function CollectionsExplorer({
  folders: initialFolders,
  collections: initialCollections,
  currentFolderId,
  currentFolderName,
  parentFolderId,
  canCreateSubfolder,
  folderCoverCards,
}: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [collections, setCollections] = useState(initialCollections);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const draggingCollection = draggingId
    ? collections.find((c) => c.id === draggingId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id).replace(/^c-/, "");
    setDraggingId(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    if (!event.over) return;
    const collectionId = String(event.active.id).replace(/^c-/, "");
    const overId = String(event.over.id);
    let targetFolderId: string | null = null;
    if (overId === "root-dropzone") {
      targetFolderId = null;
    } else if (overId.startsWith("f-")) {
      targetFolderId = overId.slice(2);
    } else {
      return;
    }
    const c = collections.find((c) => c.id === collectionId);
    if (!c || c.folder_id === targetFolderId) return;

    // Optimistic remove (the collection leaves the current view as soon
    // as it lands in a folder) — the server action revalidates the page
    // so a refresh recovers if the action fails.
    setCollections((prev) =>
      prev.filter((x) => x.id !== collectionId),
    );
    startTransition(async () => {
      await setCollectionFolder(collectionId, targetFolderId);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <Header
          currentFolderId={currentFolderId}
          currentFolderName={currentFolderName}
          parentFolderId={parentFolderId}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            disabled={!canCreateSubfolder && currentFolderId !== null}
            className="btn-ghost disabled:opacity-40"
            title={
              !canCreateSubfolder && currentFolderId !== null
                ? "Folders nest at most one level deep"
                : undefined
            }
          >
            + New folder
          </button>
          <Link href="/collections/new" className="btn-primary">
            + New collection
          </Link>
        </div>

        {/* Root drop zone — only meaningful when inside a folder, so a
            user can move a collection out by dragging it onto the
            breadcrumb area. */}
        {currentFolderId !== null && <RootDropZone />}

        {folders.length === 0 && collections.length === 0 ? (
          <div className="surface p-10 text-center">
            <p className="text-ink-300">
              {currentFolderId ? "This folder is empty." : "No collections yet."}
            </p>
            {currentFolderId === null && (
              <Link href="/collections/new" className="btn-primary mt-4">
                Create your first
              </Link>
            )}
          </div>
        ) : (
          <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((f) => (
              <li key={f.id}>
                <FolderTile
                  folder={f}
                  coverCards={folderCoverCards[f.id] ?? []}
                  onUpdated={(patch) =>
                    setFolders((prev) =>
                      prev.map((x) => (x.id === f.id ? { ...x, ...patch } : x)),
                    )
                  }
                  onDeleted={() =>
                    setFolders((prev) => prev.filter((x) => x.id !== f.id))
                  }
                />
              </li>
            ))}
            {collections.map((c) => (
              <li key={c.id}>
                <CollectionTile collection={c} />
              </li>
            ))}
          </ul>
        )}

        {newFolderOpen && (
          <NewFolderDialog
            parentFolderId={currentFolderId}
            onClose={() => setNewFolderOpen(false)}
            onCreated={(folder) => {
              setFolders((prev) => [folder, ...prev]);
              setNewFolderOpen(false);
            }}
          />
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingCollection ? (
          <DragPreview collection={draggingCollection} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DragPreview({ collection }: { collection: Collection }) {
  const color: CollectionColor = isCollectionColor(collection.color)
    ? collection.color
    : "arcane";
  const cover = collection.cover_image_url;
  return (
    <div className="surface w-64 overflow-hidden rounded-lg shadow-glow ring-2 ring-violet-300 rotate-[-1deg]">
      {cover ? (
        <div className="relative h-20 w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${cover})` }}
            aria-hidden
          />
          <div
            className={`absolute inset-0 bg-gradient-to-br opacity-60 mix-blend-overlay ${COLLECTION_COLOR_GRADIENT[color]}`}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-ink-950/30 to-ink-950/80"
            aria-hidden
          />
        </div>
      ) : (
        <div
          className={`h-2 w-full bg-gradient-to-r ${COLLECTION_COLOR_GRADIENT[color]}`}
          aria-hidden
        />
      )}
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-ink-50">
          {collection.name}
        </p>
      </div>
    </div>
  );
}

function Header({
  currentFolderId,
  currentFolderName,
  parentFolderId,
}: {
  currentFolderId: string | null;
  currentFolderName: string | null;
  parentFolderId: string | null;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {currentFolderId === null ? (
          <>
            <h1 className="font-display text-3xl text-ink-50">
              Your collections
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              Organise your cards into binders, bulk, and decks.
            </p>
          </>
        ) : (
          <>
            <nav className="flex items-center gap-2 text-xs text-ink-400">
              <Link
                href={
                  parentFolderId
                    ? `/collections?folder=${parentFolderId}`
                    : "/collections"
                }
                className="inline-flex items-center gap-1 transition hover:text-ink-100"
              >
                <span aria-hidden>←</span>{" "}
                {parentFolderId ? "Parent folder" : "All collections"}
              </Link>
            </nav>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl text-ink-50">
              <span aria-hidden className="text-gold-300">
                ▸
              </span>
              {currentFolderName}
            </h1>
          </>
        )}
      </div>
    </header>
  );
}

function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "root-dropzone" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border border-dashed px-3 py-2 text-center text-xs transition ${
        isOver
          ? "border-violet-400 bg-violet-500/10 text-violet-100"
          : "border-ink-700/70 bg-ink-900/40 text-ink-500"
      }`}
    >
      Drop here to move back to All collections
    </div>
  );
}

function FolderTile({
  folder,
  coverCards,
  onUpdated,
  onDeleted,
}: {
  folder: Folder;
  coverCards: FolderCoverCard[];
  onUpdated: (patch: Partial<Folder>) => void;
  onDeleted: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `f-${folder.id}` });
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const color: CollectionColor = isCollectionColor(folder.color)
    ? folder.color
    : "arcane";
  const cover = folder.cover_image_url;

  function remove() {
    if (
      !window.confirm(
        "Delete this folder? Subfolders are also deleted; their collections fall back to the root.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteFolder(folder.id);
      if (!("error" in r)) onDeleted();
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={`surface relative h-44 overflow-hidden border-gold-400/30 transition ${
          isOver
            ? "ring-2 ring-gold-300/60 shadow-glow-gold"
            : "hover:border-gold-400/50"
        }`}
      >
        <Link
          href={`/collections?folder=${folder.id}`}
          className="block h-full"
          aria-label={`Open folder ${folder.name}`}
        >
          {cover ? (
            <div className="absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${cover})` }}
                aria-hidden
              />
              <div
                className={`absolute inset-0 bg-gradient-to-br opacity-60 mix-blend-overlay ${COLLECTION_COLOR_GRADIENT[color]}`}
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-ink-950/30 to-ink-950/90"
                aria-hidden
              />
            </div>
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br opacity-25 ${COLLECTION_COLOR_GRADIENT[color]}`}
              aria-hidden
            />
          )}
          <div className="relative flex h-full flex-col p-5">
            <div className="flex items-start justify-between">
              <span
                aria-hidden
                className="text-3xl leading-none text-gold-300 drop-shadow"
              >
                📁
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditing(true);
                  }}
                  className="btn-subtle text-[11px]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove();
                  }}
                  disabled={isPending}
                  className="btn-subtle text-[11px] text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-auto text-lg font-semibold text-ink-50 drop-shadow">
              {folder.name}
            </p>
          </div>
        </Link>
      </div>

      {editing && (
        <FolderEditDialog
          folder={folder}
          coverCards={coverCards}
          onClose={() => setEditing(false)}
          onSaved={(patch) => {
            onUpdated(patch);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

function FolderEditDialog({
  folder,
  coverCards,
  onClose,
  onSaved,
}: {
  folder: Folder;
  coverCards: FolderCoverCard[];
  onClose: () => void;
  onSaved: (patch: Partial<Folder>) => void;
}) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState<CollectionColor>(
    isCollectionColor(folder.color) ? folder.color : "arcane",
  );
  const [coverCardId, setCoverCardId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const patch: Parameters<typeof updateFolder>[1] = {
        name: trimmed,
        color,
      };
      if (coverCardId !== null) patch.coverCardId = coverCardId;
      const r = await updateFolder(folder.id, patch);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      const cardImage =
        coverCardId === null
          ? undefined
          : coverCardId === ""
            ? null
            : coverCards.find((c) => c.id === coverCardId)?.image_url ?? null;
      const cardScryfall =
        coverCardId === null || coverCardId === ""
          ? coverCardId === ""
            ? null
            : undefined
          : coverCards.find((c) => c.id === coverCardId)?.scryfall_id ?? null;
      onSaved({
        name: trimmed,
        color,
        ...(cardImage !== undefined ? { cover_image_url: cardImage } : {}),
        ...(cardScryfall !== undefined ? { cover_scryfall_id: cardScryfall } : {}),
      });
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="surface flex max-h-[85vh] w-full max-w-xl flex-col gap-4 overflow-y-auto p-5"
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl text-ink-50">Edit folder</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-ink-500 transition hover:text-ink-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="input-field"
          />
        </div>

        <ColorRadioGrid value={color} onChange={setColor} />

        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-xs uppercase tracking-wider text-ink-400">
              Cover image
            </label>
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              className="btn-subtle text-[11px]"
            >
              {picking ? "Hide picker" : "Choose"}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Picks any card art from collections in this folder. Stored
            cropped to artwork only — no card border.
          </p>
          {folder.cover_image_url && coverCardId === null && (
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-12 w-20 overflow-hidden rounded">
                <Image
                  src={folder.cover_image_url}
                  alt="Current cover"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setCoverCardId("")}
                className="btn-ghost text-rose-300 hover:border-rose-400/40"
              >
                Remove
              </button>
            </div>
          )}
          {coverCardId === "" && (
            <p className="mt-2 text-[11px] text-rose-300">
              Cover will be removed on save.
            </p>
          )}
          {picking && (
            <FolderCoverGrid
              cards={coverCards}
              currentScryfallId={folder.cover_scryfall_id}
              selectedId={
                coverCardId && coverCardId !== "" ? coverCardId : null
              }
              onPick={(id) => setCoverCardId(id)}
            />
          )}
        </div>

        {error && (
          <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="btn-primary disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderCoverGrid({
  cards,
  currentScryfallId,
  selectedId,
  onPick,
}: {
  cards: FolderCoverCard[];
  currentScryfallId: string | null;
  selectedId: string | null;
  onPick: (cardId: string) => void;
}) {
  if (cards.length === 0) {
    return (
      <p className="mt-2 rounded-md border border-dashed border-ink-700/70 p-4 text-center text-xs text-ink-500">
        No cards in this folder yet. Add cards to a collection inside it
        first, then come back.
      </p>
    );
  }
  return (
    <ul className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
      {cards.map((c) => {
        const isCurrent = c.scryfall_id === currentScryfallId;
        const isSelected = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c.id)}
              className={`group relative block w-full overflow-hidden rounded-md ring-1 transition ${
                isSelected
                  ? "ring-2 ring-violet-300 shadow-glow"
                  : isCurrent
                    ? "ring-2 ring-gold-300"
                    : "ring-ink-800/70 hover:ring-violet-400/60"
              }`}
              aria-label={`Use ${c.card_name} as cover`}
            >
              <div className="relative aspect-[5/7] w-full bg-ink-950">
                {c.image_url ? (
                  <Image
                    src={c.image_url}
                    alt={c.card_name}
                    fill
                    sizes="(max-width: 640px) 30vw, 110px"
                    className="object-cover transition group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="grid h-full place-items-center px-2 text-center text-[10px] text-ink-300">
                    {c.card_name}
                  </div>
                )}
              </div>
              {isCurrent && !isSelected && (
                <span className="absolute left-1 top-1 rounded-full bg-gold-500/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-950">
                  Current
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CollectionTile({ collection }: { collection: Collection }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `c-${collection.id}`,
  });

  const chip =
    collection.type === "binder"
      ? "chip-gold"
      : collection.type === "deck"
        ? "chip-violet"
        : "chip-rose";
  const color: CollectionColor = isCollectionColor(collection.color)
    ? collection.color
    : "arcane";
  const cover = collection.cover_image_url;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`surface deck-card-pop group block h-44 overflow-hidden hover:border-[color:var(--theme-accent)]/40 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {/* PointerSensor has a 6 px activation threshold, so a stationary
          click here propagates up unhandled and the Link fires as a
          normal navigation; a >6 px drag is picked up by dnd-kit and the
          click is suppressed. No stopPropagation needed. */}
      <Link href={`/collections/${collection.id}`} className="block h-full">
        {cover ? (
          <div className="relative h-20 w-full overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
              style={{ backgroundImage: `url(${cover})` }}
              aria-hidden
            />
            <div
              className={`absolute inset-0 bg-gradient-to-br opacity-50 mix-blend-overlay ${COLLECTION_COLOR_GRADIENT[color]}`}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-ink-950/30 to-ink-950/80"
              aria-hidden
            />
          </div>
        ) : (
          <div
            className={`h-2 w-full bg-gradient-to-r ${COLLECTION_COLOR_GRADIENT[color]}`}
            aria-hidden
          />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-1 text-base font-semibold text-ink-50">
              {collection.name}
            </h2>
            <span className={chip}>
              {COLLECTION_TYPE_LABEL[collection.type]}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-ink-400">
            {collection.description ?? " "}
          </p>
        </div>
      </Link>
    </div>
  );
}

function ColorRadioGrid({
  value,
  onChange,
}: {
  value: CollectionColor;
  onChange: (c: CollectionColor) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs uppercase tracking-wider text-ink-400">
        Banner colour
      </legend>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {COLLECTION_COLORS.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`rounded-lg border p-2 transition ${
                active
                  ? "border-violet-400 shadow-glow"
                  : "border-ink-700/60 bg-ink-950/40 hover:border-violet-400/50"
              }`}
            >
              <div
                className={`h-8 w-full rounded-md bg-gradient-to-br ${COLLECTION_COLOR_GRADIENT[c]}`}
                aria-hidden
              />
              <p
                className={`mt-1 text-center text-[11px] ${
                  active ? "text-white" : "text-ink-300"
                }`}
              >
                {COLLECTION_COLOR_LABEL[c]}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function NewFolderDialog({
  parentFolderId,
  onClose,
  onCreated,
}: {
  parentFolderId: string | null;
  onClose: () => void;
  onCreated: (folder: Folder) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<CollectionColor>("arcane");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const r = await createFolder(trimmed, parentFolderId, color);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      onCreated({
        id: r.id,
        user_id: "",
        name: trimmed,
        parent_folder_id: parentFolderId,
        color,
        cover_scryfall_id: null,
        cover_image_url: null,
        created_at: new Date().toISOString(),
      });
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="surface w-full max-w-md p-5"
      >
        <h2 className="font-display text-xl text-ink-50">
          {parentFolderId ? "New subfolder" : "New folder"}
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Folders are private to your account.
        </p>

        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Standard decks"
          maxLength={80}
          className="input-field mt-4"
        />

        <div className="mt-4">
          <ColorRadioGrid value={color} onChange={setColor} />
        </div>

        {error && (
          <p className="mt-2 text-xs text-rose-300">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="btn-primary disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
