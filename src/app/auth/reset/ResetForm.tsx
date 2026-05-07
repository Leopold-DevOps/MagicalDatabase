"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function ResetForm({ email }: { email: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Password updated. You can now sign in with it.");
        setTimeout(() => {
          router.push("/account");
          router.refresh();
        }, 900);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      {email && (
        <p className="text-sm text-ink-400">
          Setting password for{" "}
          <span className="text-ink-200">{email}</span>.
        </p>
      )}
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="mb-1.5 block text-xs uppercase tracking-wider text-ink-400"
        >
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input-field"
          autoComplete="new-password"
        />
      </div>

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
        {loading ? "Updating…" : "Save password"}
      </button>
    </form>
  );
}
