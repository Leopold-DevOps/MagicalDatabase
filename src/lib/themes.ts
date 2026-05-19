// Visual themes for the site. Each theme tweaks the aurora gradients
// that wash over the body background and the accent colour used on the
// home-page hero. Themes apply via CSS variables set on <body> in the
// root layout; the user's choice is stored in the "theme" cookie.

export const THEMES = [
  "arcane",
  "bloomburrow",
  "strixhaven",
  "phyrexia",
  "innistrad",
] as const;
export type ThemeId = (typeof THEMES)[number];

export type Theme = {
  id: ThemeId;
  label: string;
  blurb: string;
  // The CSS-variable values applied at the body level. Strings so we
  // can interpolate them into linear-gradient(...) directly.
  vars: {
    "--theme-aurora-top": string;
    "--theme-aurora-corner": string;
    "--theme-aurora-bottom-right": string;
    "--theme-aurora-bottom-left": string;
    "--theme-grid-line": string;
    "--theme-accent": string;
    "--theme-accent-soft": string;
  };
  // Backdrop art for the home-page hero. Uses Scryfall's named redirect
  // (CSS bg-image follows the 302 to the real /art_crop/ asset), so we
  // never have to hand-maintain UUIDs. credit is the card name behind
  // the art.
  artUrl: string;
  artCredit: string;
};

export const THEME_LIST: Theme[] = [
  {
    id: "arcane",
    label: "Arcane",
    blurb: "Mystic violet with gold sigils — the house style.",
    vars: {
      "--theme-aurora-top": "rgba(168, 85, 247, 0.34)",
      "--theme-aurora-corner": "rgba(251, 191, 36, 0.12)",
      "--theme-aurora-bottom-right": "rgba(244, 114, 182, 0.14)",
      "--theme-aurora-bottom-left": "rgba(99, 102, 241, 0.18)",
      "--theme-grid-line": "rgba(167, 139, 250, 0.07)",
      "--theme-accent": "#fbbf24",
      "--theme-accent-soft": "rgba(251, 191, 36, 0.18)",
    },
    artUrl:
      "https://api.scryfall.com/cards/named?exact=Liliana+of+the+Veil&format=image&version=art_crop",
    artCredit: "Liliana of the Veil",
  },
  {
    id: "bloomburrow",
    label: "Bloomburrow",
    blurb: "Warm earth, fall light, woodland edges.",
    vars: {
      "--theme-aurora-top": "rgba(245, 158, 11, 0.28)",
      "--theme-aurora-corner": "rgba(132, 204, 22, 0.18)",
      "--theme-aurora-bottom-right": "rgba(217, 119, 6, 0.18)",
      "--theme-aurora-bottom-left": "rgba(101, 163, 13, 0.22)",
      "--theme-grid-line": "rgba(217, 119, 6, 0.08)",
      "--theme-accent": "#84cc16",
      "--theme-accent-soft": "rgba(132, 204, 22, 0.22)",
    },
    artUrl:
      "https://api.scryfall.com/cards/named?exact=Mabel%2C+Heir+to+Cragflame&format=image&version=art_crop",
    artCredit: "Mabel, Heir to Cragflame",
  },
  {
    id: "strixhaven",
    label: "Strixhaven",
    blurb: "Academic indigo and teal — five colleges of magic.",
    vars: {
      "--theme-aurora-top": "rgba(56, 189, 248, 0.30)",
      "--theme-aurora-corner": "rgba(165, 180, 252, 0.18)",
      "--theme-aurora-bottom-right": "rgba(14, 165, 233, 0.18)",
      "--theme-aurora-bottom-left": "rgba(99, 102, 241, 0.22)",
      "--theme-grid-line": "rgba(94, 234, 212, 0.08)",
      "--theme-accent": "#5eead4",
      "--theme-accent-soft": "rgba(94, 234, 212, 0.22)",
    },
    artUrl:
      "https://api.scryfall.com/cards/named?exact=Professor+Onyx&format=image&version=art_crop",
    artCredit: "Professor Onyx",
  },
  {
    id: "phyrexia",
    label: "Phyrexia",
    blurb: "Oil, machinery, glistening corruption.",
    vars: {
      "--theme-aurora-top": "rgba(190, 18, 60, 0.30)",
      "--theme-aurora-corner": "rgba(20, 184, 166, 0.14)",
      "--theme-aurora-bottom-right": "rgba(120, 53, 15, 0.22)",
      "--theme-aurora-bottom-left": "rgba(15, 23, 42, 0.45)",
      "--theme-grid-line": "rgba(244, 63, 94, 0.07)",
      "--theme-accent": "#f43f5e",
      "--theme-accent-soft": "rgba(244, 63, 94, 0.20)",
    },
    artUrl:
      "https://api.scryfall.com/cards/named?exact=Sheoldred%2C+the+Apocalypse&format=image&version=art_crop",
    artCredit: "Sheoldred, the Apocalypse",
  },
  {
    id: "innistrad",
    label: "Innistrad",
    blurb: "Gothic blue night, full moon, dark cathedral.",
    vars: {
      "--theme-aurora-top": "rgba(59, 130, 246, 0.28)",
      "--theme-aurora-corner": "rgba(226, 232, 240, 0.10)",
      "--theme-aurora-bottom-right": "rgba(30, 41, 59, 0.45)",
      "--theme-aurora-bottom-left": "rgba(99, 102, 241, 0.22)",
      "--theme-grid-line": "rgba(148, 163, 184, 0.08)",
      "--theme-accent": "#94a3b8",
      "--theme-accent-soft": "rgba(148, 163, 184, 0.22)",
    },
    artUrl:
      "https://api.scryfall.com/cards/named?exact=Liliana%2C+the+Last+Hope&format=image&version=art_crop",
    artCredit: "Liliana, the Last Hope",
  },
];

const THEME_BY_ID: Record<ThemeId, Theme> = Object.fromEntries(
  THEME_LIST.map((t) => [t.id, t]),
) as Record<ThemeId, Theme>;

export function isThemeId(v: string | undefined): v is ThemeId {
  return !!v && (THEMES as readonly string[]).includes(v);
}

export function getTheme(id: string | undefined): Theme {
  return isThemeId(id) ? THEME_BY_ID[id] : THEME_BY_ID.arcane;
}

/**
 * Pick a theme deterministically from the date — used when the user
 * has opted into auto-rotation. ISO-day stride keeps the choice stable
 * for the whole day across requests / CDN edges.
 */
export function rotatingThemeForDate(date: Date = new Date()): ThemeId {
  const day = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return THEMES[day % THEMES.length]!;
}

export function themeStyle(theme: Theme): React.CSSProperties {
  return theme.vars as unknown as React.CSSProperties;
}
