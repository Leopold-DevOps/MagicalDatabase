import { NextResponse } from "next/server";
import type { QuickAddCollection } from "@/components/QuickAddButton";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { isSignedIn: false, collections: [] as QuickAddCollection[] },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { isSignedIn: false, collections: [] as QuickAddCollection[] },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const { data } = await supabase
    .from("collections")
    .select("id, name, type")
    .order("created_at", { ascending: false });

  return NextResponse.json(
    {
      isSignedIn: true,
      collections: (data ?? []) as QuickAddCollection[],
    },
    { headers: { "cache-control": "no-store" } },
  );
}
