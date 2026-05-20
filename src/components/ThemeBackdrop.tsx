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
  // If the theme already points at a direct cards.scryfall.io asset,
  // use it verbatim — most reliable, no API round-trip. Otherwise try
  // to resolve the card name to its art_crop URL, then fall back to
  // the stored artUrl, then picsum so something always renders.
  let artUrl: string;
  if (theme.artUrl.includes("cards.scryfall.io")) {
    artUrl = theme.artUrl;
  } else {
    artUrl =
      (await resolveScryfallArtCrop(theme.artCredit)) ??
      theme.artUrl ??
      `https://picsum.photos/seed/${theme.id}/1920/1080`;
  }
  return (
    // fixed positioning pins the backdrop to the viewport so it stays
    // put while page content scrolls past — gives a parallax feel
    // without any JS scroll listener. Z is 0 (not negative): rendered
    // as a body child it paints above body's bg gradient but below
    // the page content wrapper which sits at z-10.
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Plain <img> on purpose — decorative, no Next optimization,
          no remotePatterns gate, easier to debug. data-art-src exposes
          the resolved URL in devtools. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artUrl}
        alt=""
        aria-hidden
        data-art-src={artUrl}
        className="absolute left-1/2 top-1/2 h-[150%] w-[150%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover opacity-80 blur-md"
      />
      {/* Theme accent wash — multiply keeps colour while dimming brights */}
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{ backgroundColor: theme.vars["--theme-accent-soft"] }}
        aria-hidden
      />
      {/* Aurora-tinted screen pass so the body's gradient cues carry into
          the backdrop */}
      <div
        className="absolute inset-0 mix-blend-screen opacity-40"
        style={{ backgroundColor: theme.vars["--theme-aurora-top"] }}
        aria-hidden
      />
      {/* Subtle vignette only — keep enough light that the art reads */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(8,5,26,0.65)_100%)]"
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
