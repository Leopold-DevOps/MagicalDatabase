import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CollectionColorPicker } from "@/components/CollectionColorPicker";
import { CoverPicker } from "@/components/CoverPicker";
import { VisibilityToggle } from "@/components/VisibilityToggle";
import {
  type Collection,
  type CollectionCard,
  COLLECTION_TYPE_LABEL,
  isCollectionColor,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { updateCollection } from "../../actions";

type Params = Promise<{ id: string }>;
type Search = Promise<{ error?: string }>;

export default async function EditCollectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  if (!supabaseConfigured()) redirect("/collections");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/collections/${id}/edit`);

  const { data, error: dbError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (dbError || !data) notFound();
  const c = data as Collection;
  const defaultColor = isCollectionColor(c.color) ? c.color : "arcane";

  const { data: cardRows } = await supabase
    .from("collection_cards")
    .select("*")
    .eq("collection_id", id)
    .order("is_commander", { ascending: false })
    .order("added_at", { ascending: false });
  const cards = (cardRows ?? []) as CollectionCard[];

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasUsername = !!profile?.username;

  // Folders — only top-level + nested folders of the current user.
  // Display flat with a depth marker so users can see structure.
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
          href={`/collections/${c.id}`}
          className="inline-flex items-center gap-1 transition hover:text-ink-100"
        >
          <span aria-hidden>←</span> Back to {c.name}
        </Link>
      </div>

      <div className="surface-glow p-6">
        <h1 className="font-display text-2xl text-ink-50">
          Edit collection
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          {COLLECTION_TYPE_LABEL[c.type]} · type can&apos;t be changed.
        </p>

        <form action={updateCollection} className="mt-6 space-y-5">
          <input type="hidden" name="id" value={c.id} />

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
              defaultValue={c.name}
              className="input-field"
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
              defaultValue={c.description ?? ""}
              className="input-field resize-none"
              placeholder="Notes for future you."
            />
          </div>

          <CollectionColorPicker defaultValue={defaultColor} />

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
              defaultValue={c.folder_id ?? ""}
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

          {error && (
            <p className="rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Link href={`/collections/${c.id}`} className="btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>

        {/* Visibility + Cover live outside the form because they save
            immediately via their own server actions and shouldn't be tied
            to the form submit. */}
        <div className="mt-6 border-t border-ink-800/60 pt-5">
          <VisibilityToggle
            collectionId={c.id}
            initial={c.is_public}
            hasUsername={hasUsername}
          />
        </div>

        <div className="mt-5 border-t border-ink-800/60 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-400">
                Cover image
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Pick a card from this collection — its artwork becomes the
                banner on the detail page and the index tile.
              </p>
            </div>
            <CoverPicker
              collectionId={c.id}
              cards={cards}
              currentScryfallId={c.cover_scryfall_id}
              hasCover={!!c.cover_image_url}
            />
          </div>
          {c.cover_image_url && (
            <div className="mt-3 overflow-hidden rounded-md ring-1 ring-ink-800/70">
              <div
                className="h-24 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${c.cover_image_url})` }}
                aria-hidden
              />
            </div>
          )}
        </div>
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
          {"    "}↳ {child.name}
        </option>
      ))}
    </>
  );
}
