"use client";

import { useTransition } from "react";
import { setTheme } from "@/app/actions/theme";
import { THEME_LIST, type ThemeId } from "@/lib/themes";

export function ThemePicker({
  currentTheme,
  autoRotate,
}: {
  currentTheme: ThemeId;
  autoRotate: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function pick(id: ThemeId | "auto") {
    startTransition(async () => {
      await setTheme(id);
    });
  }

  return (
    <div className="surface mt-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink-100">Theme</h2>
        <p className="text-[11px] text-ink-500">
          Skins the site&apos;s background accent.
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-400">
        Pick one or let the site rotate through them daily.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <AutoTile
          active={autoRotate}
          disabled={isPending}
          onClick={() => pick("auto")}
        />
        {THEME_LIST.map((t) => (
          <ThemeTile
            key={t.id}
            theme={t}
            active={!autoRotate && currentTheme === t.id}
            disabled={isPending}
            onClick={() => pick(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeTile({
  theme,
  active,
  disabled,
  onClick,
}: {
  theme: (typeof THEME_LIST)[number];
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  // Compose a swatch preview from the theme's aurora variables.
  const swatchStyle: React.CSSProperties = {
    backgroundImage: `radial-gradient(circle at 30% 30%, ${theme.vars["--theme-aurora-top"]}, transparent 70%), radial-gradient(circle at 80% 80%, ${theme.vars["--theme-aurora-bottom-right"]}, transparent 70%), linear-gradient(135deg, #150d2e, #08051a)`,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-44 flex-col gap-2 rounded-lg border p-2 text-left transition disabled:opacity-50 ${
        active
          ? "border-violet-400 shadow-glow"
          : "border-ink-700/60 bg-ink-950/40 hover:border-violet-400/50"
      }`}
    >
      <div
        className="h-14 w-full rounded-md ring-1 ring-ink-800/60"
        style={swatchStyle}
        aria-hidden
      />
      <div>
        <p className="text-sm font-medium text-ink-100">{theme.label}</p>
        <p className="line-clamp-1 text-[11px] text-ink-500">{theme.blurb}</p>
      </div>
    </button>
  );
}

function AutoTile({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-44 flex-col gap-2 rounded-lg border p-2 text-left transition disabled:opacity-50 ${
        active
          ? "border-gold-400 shadow-glow-gold"
          : "border-ink-700/60 bg-ink-950/40 hover:border-gold-400/50"
      }`}
    >
      <div
        className="grid h-14 w-full place-items-center rounded-md ring-1 ring-ink-800/60 text-2xl"
        style={{
          backgroundImage:
            "conic-gradient(from 90deg at 50% 50%, rgba(168,85,247,0.35), rgba(132,204,22,0.35), rgba(94,234,212,0.35), rgba(244,63,94,0.35), rgba(168,85,247,0.35))",
        }}
        aria-hidden
      >
        ⟳
      </div>
      <div>
        <p className="text-sm font-medium text-ink-100">Rotate daily</p>
        <p className="line-clamp-1 text-[11px] text-ink-500">
          A different theme each day.
        </p>
      </div>
    </button>
  );
}
