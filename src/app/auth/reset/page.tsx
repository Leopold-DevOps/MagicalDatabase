import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { ResetForm } from "./ResetForm";

export default async function ResetPasswordPage() {
  if (!supabaseConfigured()) redirect("/");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // To set a password you must be authenticated. The recovery email link
  // bounces through /auth/callback first, which establishes a session and
  // then redirects here.
  if (!user) {
    return (
      <div className="mx-auto max-w-md">
        <div className="surface-glow p-8 text-center">
          <h1 className="font-display text-2xl text-ink-50">Set a password</h1>
          <p className="mt-2 text-sm text-ink-400">
            You need to be signed in to set or change a password. Sign in with a
            magic link, then come back here.
          </p>
          <Link
            href="/auth/login?next=/auth/reset"
            className="btn-primary mt-6"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="surface-glow p-8">
        <h1 className="font-display text-2xl text-ink-50">Set a password</h1>
        <p className="mt-1 text-sm text-ink-400">
          After this, you can sign in with email + password — no inbox needed.
        </p>
        <ResetForm email={user.email ?? null} />
      </div>
    </div>
  );
}
