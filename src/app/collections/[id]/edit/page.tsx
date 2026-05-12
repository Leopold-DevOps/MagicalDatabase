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

      <div className="flex flex-col gap-6">
        <div className="surface-glow p-6">
          <h1 className="font-display text-2xl text-ink-50">
            Edit collection
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {COLLECTION_TYPE_LABEL[c.type]} · type can&apos;t be changed.
          </p>

          <form action={updateCollection} className="mt-6 flex flex-col gap-6">
            <input type="hidden" name="id" value={c.id} />

            <Section title="Details" hint="Name and notes for this collection.">
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

              <div className="mt-4">
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
            </Section>

            <Section
              title="Appearance"
              hint="The accent colour used in the banner and tile."
            >
              <CollectionColorPicker defaultValue={defaultColor} />
            </Section>

            <Section
              title="Organisation"
              hint="Group this collection into one of your folders."
            >
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
            </Section>

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
        </div>

        {/* Visibility and Cover save immediately via their own server
            actions, so they sit in their own panels below the main form. */}
        <div className="surface p-6">
          <SectionHeader
            title="Visibility"
            hint="Decide who can see this collection."
          />
          <div className="mt-4">
            <VisibilityToggle
              collectionId={c.id}
              initial={c.is_public}
              hasUsername={hasUsername}
            />
          </div>
        </div>

        <div className="surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader
              title="Cover image"
              hint="Pick a card from this collection — its artwork becomes the banner on the detail page and the index tile."
            />
            <CoverPicker
              collectionId={c.id}
              cards={cards}
              currentScryfallId={c.cover_scryfall_id}
              hasCover={!!c.cover_image_url}
            />
          </div>
          {c.cover_image_url && (
            <div className="mt-4 overflow-hidden rounded-md ring-1 ring-ink-800/70">
              <div
                className="h-28 w-full bg-cover bg-center"
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionHeader title={title} hint={hint} />
      <div className="mt-3">{children}</div>
      <div className="gold-rule mt-6" />
    </section>
  );
}

function SectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <h2 className="font-display text-base text-ink-50">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
