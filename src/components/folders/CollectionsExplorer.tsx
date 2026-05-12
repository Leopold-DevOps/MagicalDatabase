"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createFolder,
  deleteFolder,
  renameFolder,
  setCollectionFolder,
} from "@/app/collections/actions";
import {
  COLLECTION_COLOR_GRADIENT,
  COLLECTION_TYPE_LABEL,
  isCollectionColor,
  type Collection,
  type CollectionColor,
  type Folder,
} from "@/lib/collections";

type Props = {
  folders: Folder[];
  collections: Collection[];
  currentFolderId: string | null;
  currentFolderName: string | null;
  parentFolderId: string | null;
  // True if we're at depth 1 (inside a folder); the +Folder button is
  // hidden for deeper-than-one nesting.
  canCreateSubfolder: boolean;
};

export function CollectionsExplorer({
  folders: initialFolders,
  collections: initialCollections,
  currentFolderId,
  currentFolderName,
  parentFolderId,
  canCreateSubfolder,
}: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [collections, setCollections] = useState(initialCollections);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
                  onRenamed={(name) =>
                    setFolders((prev) =>
                      prev.map((x) => (x.id === f.id ? { ...x, name } : x)),
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
    </DndContext>
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
  onRenamed,
  onDeleted,
}: {
  folder: Folder;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `f-${folder.id}` });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const [isPending, startTransition] = useTransition();

  function save() {
    const next = name.trim();
    if (!next || next === folder.name) {
      setRenaming(false);
      setName(folder.name);
      return;
    }
    startTransition(async () => {
      const r = await renameFolder(folder.id, next);
      if (!("error" in r)) {
        onRenamed(next);
      } else {
        setName(folder.name);
      }
      setRenaming(false);
    });
  }

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
    <div
      ref={setNodeRef}
      className={`surface relative h-44 overflow-hidden border-gold-400/30 bg-gradient-to-br from-gold-500/10 via-ink-900/70 to-ink-900/70 transition ${
        isOver
          ? "ring-2 ring-gold-300/60 shadow-glow-gold"
          : "hover:border-gold-400/50"
      }`}
    >
      <Link
        href={`/collections?folder=${folder.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open folder ${folder.name}`}
      />
      <div className="relative z-10 flex h-full flex-col p-5">
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
                setRenaming(true);
              }}
              className="btn-subtle text-[11px]"
            >
              Rename
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

        {renaming ? (
          <div className="mt-auto flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setName(folder.name);
                  setRenaming(false);
                }
              }}
              className="input-field py-1 text-sm"
              maxLength={80}
            />
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="btn-primary py-1 px-3 text-xs"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="mt-auto text-lg font-semibold text-ink-50">
            {folder.name}
          </p>
        )}
      </div>
    </div>
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
      className={`surface group block h-44 overflow-hidden transition hover:border-violet-400/40 hover:shadow-glow ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <Link
        href={`/collections/${collection.id}`}
        className="block h-full"
        onPointerDown={(e) => e.stopPropagation()}
      >
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const r = await createFolder(trimmed, parentFolderId);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      onCreated({
        id: r.id,
        user_id: "",
        name: trimmed,
        parent_folder_id: parentFolderId,
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
