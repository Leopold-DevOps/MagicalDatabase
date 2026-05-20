import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ChromeShell } from "@/components/ChromeShell";
import { ThemeBackdrop } from "@/components/ThemeBackdrop";
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
            page content. ChromeShell wraps everything else with
            `relative z-10` so header / main / footer sit on top
            (except on `/` where ChromeShell drops the chrome and
            renders <main> bare for the landing experience). */}
        <ThemeBackdrop theme={theme} />
        <div className="relative z-10">
          <ChromeShell>{children}</ChromeShell>
        </div>
      </body>
    </html>
  );
}
