import { redirect } from "next/navigation";
import {
  CollectionsExplorer,
  type FolderCoverCard,
} from "@/components/folders/CollectionsExplorer";
import {
  type Collection,
  type Folder,
} from "@/lib/collections";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

type Search = Promise<{ folder?: string }>;

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  if (!supabaseConfigured()) {
    return (
      <div className="surface mx-auto max-w-md p-6 text-center">
        <h1 className="font-display text-2xl text-ink-50">
          Supabase not configured
        </h1>
        <p className="mt-2 text-sm text-ink-400">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use
          collections.
        </p>
      </div>
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/collections");

  const { folder: rawFolderId } = await searchParams;
  const currentFolderId = rawFolderId ?? null;

  // Resolve the current folder (for breadcrumb + parent lookup) and
  // confirm it belongs to this user (RLS handles auth; .maybeSingle
  // returns null if the id is wrong or the folder belongs to someone
  // else, in which case we fall back to root).
  let current: Folder | null = null;
  if (currentFolderId) {
    const { data } = await supabase
      .from("folders")
      .select("*")
      .eq("id", currentFolderId)
      .maybeSingle();
    current = (data as Folder) ?? null;
  }
  const effectiveFolderId = current?.id ?? null;

  // Folders at this level — children of the current folder, or
  // top-level when at root.
  const foldersQ = supabase.from("folders").select("*");
  const { data: folderRows } = effectiveFolderId
    ? await foldersQ.eq("parent_folder_id", effectiveFolderId).order("name")
    : await foldersQ.is("parent_folder_id", null).order("name");

  // Collections at this level — only direct children of the current
  // folder (or those with no folder when at root).
  const collectionsQ = supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: collectionRows } = effectiveFolderId
    ? await collectionsQ.eq("folder_id", effectiveFolderId)
    : await collectionsQ.is("folder_id", null);

  const folders = (folderRows ?? []) as Folder[];
  const collections = (collectionRows ?? []) as Collection[];

  // Cover-candidate cards per folder — cards from the folder's own
  // collections plus any subfolder collections. One round-trip total:
  // fetch every card in any of those collections and bucket client-side.
  const folderCoverCards: Record<string, FolderCoverCard[]> = {};
  if (folders.length > 0) {
    const folderIds = folders.map((f) => f.id);

    // Map every collection (in these folders + their subfolders) back
    // to the top-level folder for bucketing.
    const { data: childFolderRows } = await supabase
      .from("folders")
      .select("id, parent_folder_id")
      .in("parent_folder_id", folderIds);
    const childToParent = new Map<string, string>();
    for (const cf of childFolderRows ?? []) {
      childToParent.set(cf.id as string, cf.parent_folder_id as string);
    }
    const allFolderIds = [
      ...folderIds,
      ...Array.from(childToParent.keys()),
    ];

    const { data: collectionRowsForCover } = await supabase
      .from("collections")
      .select("id, folder_id")
      .in("folder_id", allFolderIds);
    const collectionToFolder = new Map<string, string>();
    for (const c of collectionRowsForCover ?? []) {
      const folderId = c.folder_id as string;
      const bucket = folderIds.includes(folderId)
        ? folderId
        : childToParent.get(folderId);
      if (bucket) collectionToFolder.set(c.id as string, bucket);
    }

    if (collectionToFolder.size > 0) {
      const { data: cardRows } = await supabase
        .from("collection_cards")
        .select("id, scryfall_id, card_name, image_url, collection_id")
        .in("collection_id", Array.from(collectionToFolder.keys()))
        .order("added_at", { ascending: false })
        .limit(2000);
      for (const card of cardRows ?? []) {
        const bucket = collectionToFolder.get(card.collection_id as string);
        if (!bucket) continue;
        const list = folderCoverCards[bucket] ?? [];
        if (list.length >= 60) continue;
        list.push({
          id: card.id as string,
          scryfall_id: card.scryfall_id as string,
          card_name: card.card_name as string,
          image_url: (card.image_url as string | null) ?? null,
        });
        folderCoverCards[bucket] = list;
      }
    }
  }

  // The user can create a *subfolder* only when we're at root. Inside a
  // folder we're already at depth 1, and folders nest only one level
  // deep, so the +Folder button hides itself.
  const canCreateSubfolder = effectiveFolderId === null;

  return (
    <CollectionsExplorer
      key={effectiveFolderId ?? "root"}
      folders={folders}
      collections={collections}
      currentFolderId={effectiveFolderId}
      currentFolderName={current?.name ?? null}
      parentFolderId={current?.parent_folder_id ?? null}
      canCreateSubfolder={canCreateSubfolder}
      folderCoverCards={folderCoverCards}
    />
  );
}
