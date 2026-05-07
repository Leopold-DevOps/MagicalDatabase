import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magical Database — Magic: The Gathering Card Search",
  description:
    "A purple-tinted grimoire of Magic: The Gathering cards, powered by Scryfall.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
          <header className="flex items-center justify-between py-6">
            <Link href="/" className="group flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-arcane-400 to-arcane-700 text-xl shadow-glow transition group-hover:shadow-glow-lg"
              >
                ✦
              </span>
              <span className="font-display text-xl tracking-wide text-arcane-100">
                Magical Database
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-arcane-200">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <Link href="/cards" className="hover:text-white">
                Cards
              </Link>
              <a
                href="https://scryfall.com/docs/api"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                API
              </a>
            </nav>
          </header>

          <main className="flex-1 py-6">{children}</main>

          <footer className="border-t border-arcane-800/50 py-6 text-center text-xs text-arcane-300/70">
            Card data from{" "}
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noreferrer"
              className="text-arcane-200 underline-offset-2 hover:underline"
            >
              Scryfall
            </a>
            . Magic: The Gathering is © Wizards of the Coast. This site is
            unofficial.
          </footer>
        </div>
      </body>
    </html>
  );
}
