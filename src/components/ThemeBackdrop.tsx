import { resolveScryfallArtCrop } from "@/lib/scryfall-art";
import type { Theme } from "@/lib/themes";

/**
 * Hero backdrop: theme's iconic card art, heavily blurred, layered
 * under a theme-coloured wash + dark vignette so the text on top
 * stays readable regardless of which set's art is active.
 *
 * Layers (back to front):
 *   1. The art itself, blur-2xl, scaled past edges to hide the blur halo
 *   2. A solid swatch of the theme's accent colour with mix-blend-overlay
 *   3. A second wash with the aurora-top tint for cohesion with the body
 *   4. Top-to-bottom dark fade so the hero text contrasts cleanly
 *
 * Resolves the art URL server-side via the Scryfall JSON API (cached
 * weekly) instead of using the named-redirect form, which doesn't
 * reliably follow as a CSS bg-image. Falls back to a transparent
 * layer when Scryfall is unreachable.
 */
export async function ThemeBackdrop({ theme }: { theme: Theme }) {
  const artUrl =
    (await resolveScryfallArtCrop(theme.artCredit)) ?? theme.artUrl;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Plain <img> on purpose — decorative, no Next optimization needed,
          no remotePatterns gate, and easier to debug if it fails to load. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artUrl}
        alt=""
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[120%] w-[120%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover opacity-60 blur-2xl"
      />
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ backgroundColor: theme.vars["--theme-accent-soft"] }}
        aria-hidden
      />
      <div
        className="absolute inset-0 mix-blend-screen opacity-50"
        style={{ backgroundColor: theme.vars["--theme-aurora-top"] }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink-950/55 via-ink-950/40 to-ink-950"
        aria-hidden
      />
    </div>
  );
}

export function ThemeArtCredit({ theme }: { theme: Theme }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.3em] text-ink-500">
      Art · {theme.artCredit}
    </p>
  );
}
