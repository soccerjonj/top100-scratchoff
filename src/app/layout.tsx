import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wellwatched — Track and share your film-list progress",
  description: "Track which films you've watched from the IMDB Top 100, AFI 100, NYT 21st-Century 100, and Letterboxd Top 500 — and share your progress with friends.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={playfair.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="page-hairline" aria-hidden />
        {children}
        {/* TMDB API terms require visible attribution on any site using their data. */}
        <footer className="mx-auto max-w-[1800px] border-t border-zinc-900 px-4 pb-8 pt-4 text-xs leading-relaxed text-zinc-500">
          Movie metadata and poster art courtesy of{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="text-gold underline-offset-2 hover:underline"
          >
            The Movie Database (TMDB)
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </footer>
        <div className="grain-overlay" aria-hidden />
      </body>
    </html>
  );
}
