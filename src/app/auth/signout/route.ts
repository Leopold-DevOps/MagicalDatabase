import { NextResponse } from "next/server";
import { siteUrlFromRequest } from "@/lib/site-url";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", siteUrlFromRequest(request)), {
    status: 303,
  });
}
