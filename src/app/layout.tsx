import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeBackdrop } from "@/components/ThemeBackdrop";
import { UserMenu } from "@/components/UserMenu";
import { getTheme, rotatingThemeForDate, themeStyle } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magical Database — Magic: The Gathering Card Search",
  description:
    "A magical, modern explorer for Magic: The Gathering cards, powered by Scryfall.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const rotate = store.get("theme_rotate")?.value === "1";
  const explicit = store.get("theme")?.value;
  const themeId = rotate ? rotatingThemeForDate() : explicit;
  const theme = getTheme(themeId);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased"
        data-theme={theme.id}
        style={themeStyle(theme)}
      >
        {/* Theme art renders as the first body child so it paints
            above the body's background gradients but below positioned
            page content. The wrapper below uses `relative z-10` to
            ensure header / main / footer always sit on top. */}
        <ThemeBackdrop theme={theme} />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6">
          <header className="flex items-center justify-between border-b border-ink-700/50 py-5">
            <Link href="/" className="group flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-400 via-violet-500 to-violet-700 text-sm font-semibold text-gold-200 shadow-glow ring-1 ring-gold-300/30 transition group-hover:from-violet-300 group-hover:to-violet-600 group-hover:text-gold-100 group-hover:ring-gold-300/60"
              >
                ✦
              </span>
              <span className="font-display text-lg tracking-wide text-ink-50 transition group-hover:text-white">
                Magical Database
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-ink-300">
              <Link href="/cards" className="transition hover:text-white">
                Cards
              </Link>
              <Link href="/browse" className="transition hover:text-white">
                Browse
              </Link>
              <Link
                href="/collections"
                className="transition hover:text-white"
              >
                Collections
              </Link>
              <Suspense fallback={null}>
                <UserMenu />
              </Suspense>
            </nav>
          </header>

          <main className="flex-1 py-10">{children}</main>

          <footer className="border-t border-ink-700/50 py-6 text-center text-xs text-ink-500">
            Card data from{" "}
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noreferrer"
              className="text-ink-300 underline-offset-2 hover:text-white hover:underline"
            >
              Scryfall
            </a>
            . Magic: The Gathering is © Wizards of the Coast. Unofficial.
          </footer>
        </div>
      </body>
    </html>
  );
}
