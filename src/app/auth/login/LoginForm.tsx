"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "magic";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/collections";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function reset(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          router.push(next);
          router.refresh();
        }
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          setError(error.message);
        } else if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setInfo(
            `Account created. Check ${email} to confirm, then sign in.`,
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) setError(error.message);
        else setInfo(`Magic link sent to ${email}.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create account"
        : "Magic link";
  const blurb =
    mode === "signin"
      ? "Sign in to your collections."
      : mode === "signup"
        ? "Start curating your multiverse."
        : "We'll email you a one-tap sign-in link.";
  const cta =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : "Send link";

  return (
    <div className="mx-auto max-w-md">
      <div className="surface-glow p-8">
        <div
          role="tablist"
          className="flex items-center gap-1 rounded-lg border border-ink-700/60 bg-ink-950/50 p-1"
        >
          <TabButton
            active={mode === "signin"}
            onClick={() => reset("signin")}
          >
            Sign in
          </TabButton>
          <TabButton
            active={mode === "signup"}
            onClick={() => reset("signup")}
          >
            Sign up
          </TabButton>
          <TabButton active={mode === "magic"} onClick={() => reset("magic")}>
            Magic link
          </TabButton>
        </div>

        <h1 className="mt-6 font-display text-2xl text-ink-50">{heading}</h1>
        <p className="mt-1 text-sm text-ink-400">{blurb}</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
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
              autoComplete="email"
            />
          </div>

          {mode !== "magic" && (
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder={
                  mode === "signup" ? "At least 8 characters" : "Your password"
                }
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />
            </div>
          )}

          {error && (
            <p className="rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working…" : cta}
          </button>
        </form>

        {mode === "signin" && (
          <p className="mt-4 text-center text-xs text-ink-500">
            New here?{" "}
            <button
              type="button"
              onClick={() => reset("signup")}
              className="text-violet-300 transition hover:text-white"
            >
              Create an account
            </button>
          </p>
        )}
        {mode === "signup" && (
          <p className="mt-4 text-center text-xs text-ink-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => reset("signin")}
              className="text-violet-300 transition hover:text-white"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? "bg-violet-500/20 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35)]"
          : "text-ink-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
