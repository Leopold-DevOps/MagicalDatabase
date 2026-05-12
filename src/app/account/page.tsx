import Link from "next/link";
import { redirect } from "next/navigation";
import { UsernameEditor } from "@/components/UsernameEditor";
import { supabaseConfigured } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AccountPage() {
  if (!supabaseConfigured()) redirect("/");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "—";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl text-ink-50">Account</h1>
      <p className="mt-1 text-sm text-ink-400">Your sign-in details.</p>

      <div className="surface mt-6 divide-y divide-ink-800/60">
        <Row label="Email">{user.email ?? "—"}</Row>
        <Row label="User ID">
          <code className="text-xs text-ink-300">{user.id}</code>
        </Row>
        <Row label="Member since">{created}</Row>
      </div>

      <UsernameEditor initialUsername={profile?.username ?? null} />

      <div className="surface mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink-100">Password</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            Set or change your password so you can sign in without an email.
          </p>
        </div>
        <Link href="/auth/reset" className="btn-primary">
          Change password
        </Link>
      </div>

      <div className="mt-4 flex justify-end">
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <span className="text-xs uppercase tracking-wider text-ink-500">
        {label}
      </span>
      <span className="text-sm text-ink-100">{children}</span>
    </div>
  );
}
