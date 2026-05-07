import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getSessionUser } from "@/lib/supabase/server";

export async function UserMenu() {
  if (!supabaseConfigured()) return null;
  const user = await getSessionUser();

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm text-ink-300 transition hover:text-white"
      >
        Sign in
      </Link>
    );
  }

  const label = user.email ?? user.id.slice(0, 6);
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="hidden text-xs text-ink-400 transition hover:text-white md:inline"
        title="Account"
      >
        {label}
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn-subtle">
          Sign out
        </button>
      </form>
    </div>
  );
}
