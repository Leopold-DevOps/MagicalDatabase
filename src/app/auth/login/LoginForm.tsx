"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/collections";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next,
      )}`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (signInError) setError(signInError.message);
      else setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="surface-glow p-8">
        <h1 className="font-display text-3xl text-ink-50">Sign in</h1>
        <p className="mt-2 text-sm text-ink-400">
          Enter your email and we&apos;ll send you a magic link.
        </p>

        {sent ? (
          <p className="mt-6 rounded-lg border border-violet-400/40 bg-violet-500/10 p-4 text-sm text-violet-200">
            Check <span className="font-medium">{email}</span> for a link to
            sign in. You can close this tab.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="planeswalker@multiverse.gg"
              />
            </div>
            {error && (
              <p className="rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
