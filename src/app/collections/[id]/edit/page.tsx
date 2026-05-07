import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CollectionColorPicker } from "@/components/CollectionColorPicker";
import {
  type Collection,
  COLLECTION_TYPE_LABEL,
  isCollectionColor,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { updateCollection } from "../../actions";

type Params = Promise<{ id: string }>;
type Search = Promise<{ error?: string }>;

const ERROR_MESSAGE: Record<string, string> = {
  name: "Name is required.",
  color: "Pick a valid color.",
  db: "Couldn't save changes. Try again.",
};

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

          {error && ERROR_MESSAGE[error] && (
            <p className="rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
              {ERROR_MESSAGE[error]}
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
    </div>
  );
}
