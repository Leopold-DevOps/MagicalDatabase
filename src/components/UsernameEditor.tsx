"use client";

import { useState, useTransition } from "react";
import { setUsername } from "@/app/collections/actions";
import { validateUsername } from "@/lib/collections";

export function UsernameEditor({
  initialUsername,
}: {
  initialUsername: string | null;
}) {
  const [value, setValue] = useState(initialUsername ?? "");
  const [saved, setSaved] = useState<string | null>(initialUsername);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const localError = value.trim() === "" ? null : validateUsername(value.trim().toLowerCase());
  const dirty = value.trim().toLowerCase() !== (saved ?? "");

  function submit() {
    const next = value.trim().toLowerCase();
    const err = validateUsername(next);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await setUsername(next);
      if ("error" in r) {
        setError(r.error);
      } else {
        setSaved(next);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }
    });
  }

  return (
    <div className="surface mt-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink-100">Username</h2>
        <p className="text-[11px] text-ink-500">
          Public handle. Required to appear in /browse.
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-400">
        3–30 characters; lowercase letters, digits, <code>_</code>, or{" "}
        <code>-</code>.
      </p>

      <div className="mt-3 flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
            @
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="leopold"
            maxLength={30}
            className="input-field pl-7"
            aria-invalid={!!error}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !!localError || !dirty}
          className="btn-primary px-4 disabled:opacity-50"
        >
          {isPending ? "Saving…" : saved ? "Update" : "Claim"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      )}
      {!error && localError && value.trim() !== "" && (
        <p className="mt-2 text-xs text-amber-300">{localError}</p>
      )}
      {ok && !error && (
        <p className="mt-2 text-xs text-violet-300">Username saved.</p>
      )}
    </div>
  );
}
