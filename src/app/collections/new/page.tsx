import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectionColorPicker } from "@/components/CollectionColorPicker";
import {
  COLLECTION_TYPES,
  COLLECTION_TYPE_BLURB,
  COLLECTION_TYPE_LABEL,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { createCollection } from "../actions";

type Search = Promise<{ folder?: string }>;

export default async function NewCollectionPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  if (!supabaseConfigured()) redirect("/collections");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/collections/new");

  const { folder: defaultFolder } = await searchParams;

  const { data: folderRows } = await supabase
    .from("folders")
    .select("id, name, parent_folder_id")
    .order("name");
  const folders = folderRows ?? [];
  const topLevel = folders.filter((f) => f.parent_folder_id === null);
  const childrenByParent = new Map<string, typeof folders>();
  for (const f of folders) {
    if (!f.parent_folder_id) continue;
    const list = childrenByParent.get(f.parent_folder_id) ?? [];
    list.push(f);
    childrenByParent.set(f.parent_folder_id, list);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-sm text-ink-400">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1 transition hover:text-ink-100"
        >
          <span aria-hidden>←</span> Back to collections
        </Link>
      </div>
      <div className="surface-glow p-6">
        <h1 className="font-display text-2xl text-ink-50">New collection</h1>
        <p className="mt-1 text-sm text-ink-400">
          Pick a type, give it a name, and start adding cards.
        </p>

        <form action={createCollection} className="mt-6 space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-ink-400">
              Type
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {COLLECTION_TYPES.map((t, i) => (
                <label
                  key={t}
                  className="group relative flex cursor-pointer flex-col gap-1 rounded-lg border border-ink-700/60 bg-ink-950/40 p-3 transition hover:border-violet-400/50 has-[input:checked]:border-violet-400 has-[input:checked]:bg-violet-500/10 has-[input:checked]:shadow-glow"
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    defaultChecked={i === 0}
                    required
                    className="peer sr-only"
                  />
                  <span className="text-sm font-medium text-ink-100">
                    {COLLECTION_TYPE_LABEL[t]}
                  </span>
                  <span className="text-xs text-ink-400">
                    {COLLECTION_TYPE_BLURB[t]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              autoFocus
              className="input-field"
              placeholder="e.g. Mono-black control"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
            >
              Description <span className="text-ink-600">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              className="input-field resize-none"
              placeholder="Notes for future you."
            />
          </div>

          <CollectionColorPicker />

          <div>
            <label
              htmlFor="folder_id"
              className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
            >
              Folder <span className="text-ink-600">(optional)</span>
            </label>
            <select
              id="folder_id"
              name="folder_id"
              defaultValue={defaultFolder ?? ""}
              className="input-field"
            >
              <option value="">None</option>
              {topLevel.map((f) => (
                <FolderOptions
                  key={f.id}
                  folder={f}
                  children={childrenByParent.get(f.id) ?? []}
                />
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Link href="/collections" className="btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn-primary">
              Create collection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FolderOptions({
  folder,
  children,
}: {
  folder: { id: string; name: string };
  children: { id: string; name: string }[];
}) {
  return (
    <>
      <option value={folder.id}>{folder.name}</option>
      {children.map((child) => (
        <option key={child.id} value={child.id}>
          {"    "}↳ {child.name}
        </option>
      ))}
    </>
  );
}
