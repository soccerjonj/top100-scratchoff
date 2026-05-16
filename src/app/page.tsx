import Link from "next/link";
import { UsernameForm } from "@/components/UsernameForm";
import { ContinueShortcut } from "@/components/ContinueShortcut";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 overflow-hidden px-6 py-16 text-center">
      <div className="spotlight-drift" aria-hidden />
      <h1 className="fade-rise-1 relative font-display text-5xl font-bold tracking-tight sm:text-6xl">
        <span className="text-shimmer">Wellwatched</span>
      </h1>
      <p className="fade-rise-2 relative max-w-md text-balance text-zinc-400">
        Track and share your film-list progress. Enter your Letterboxd
        username to reveal which films you&apos;ve watched from the IMDB
        Top 100, AFI 100, NYT 21st-Century 100, and Letterboxd Top 500.
        Updated daily.
      </p>
      <div className="fade-rise-3 relative flex w-full flex-col items-center gap-6">
        <ContinueShortcut />
        <UsernameForm />
      </div>
      <p className="fade-rise-4 relative text-xs text-zinc-600">
        We only read your public Letterboxd profile — nothing private.
      </p>
      <div className="fade-rise-5 relative border-t border-zinc-900 pt-6 text-sm">
        <p className="text-zinc-500">
          Don&apos;t have Letterboxd?{" "}
          <Link
            href="/no-letterboxd"
            className="font-semibold text-gold underline-offset-2 hover:underline"
          >
            Track films manually →
          </Link>
        </p>
      </div>
    </main>
  );
}
