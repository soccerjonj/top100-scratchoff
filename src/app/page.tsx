import Link from "next/link";
import { UsernameForm } from "@/components/UsernameForm";
import { ContinueShortcut } from "@/components/ContinueShortcut";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        <span className="text-gold">Top 100</span> Scratch-Off
      </h1>
      <p className="max-w-md text-balance text-zinc-400">
        Enter your Letterboxd username to reveal which films you&apos;ve watched
        from the IMDB Top 100, AFI 100, NYT 21st-Century 100, and Letterboxd
        Top 500. Updated daily.
      </p>
      <ContinueShortcut />
      <UsernameForm />
      <p className="text-xs text-zinc-600">
        Your username is public. We scrape your public /films page only.
      </p>
      <div className="border-t border-zinc-900 pt-6 text-sm">
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
