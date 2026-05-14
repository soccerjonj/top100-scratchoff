import Link from "next/link";
import { GuestForm } from "./GuestForm";

export const dynamic = "force-dynamic";

export default function NoLetterboxdPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-xs text-zinc-500 hover:text-gold">
        ← back
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          No Letterboxd? <span className="text-gold">No problem.</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Pick any nickname. We&apos;ll create a profile you can use to
          manually tick off films from each list — no Letterboxd account
          needed. You can always come back later by typing the same nickname.
        </p>
      </header>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <GuestForm />
      </div>

      <ul className="flex flex-col gap-2 text-sm text-zinc-400">
        <li className="flex gap-2">
          <span className="text-gold">✓</span>
          Browse the IMDB, AFI, NYT, and Letterboxd lists
        </li>
        <li className="flex gap-2">
          <span className="text-gold">✓</span>
          Tap any film and use the &ldquo;Mark watched&rdquo; toggle in the
          popup
        </li>
        <li className="flex gap-2">
          <span className="text-gold">✓</span>
          Share your progress to social media just like normal
        </li>
        <li className="flex gap-2 text-zinc-600">
          <span>×</span>
          No auto-syncing — you do the ticking
        </li>
      </ul>

      <p className="text-xs text-zinc-600">
        Already have a Letterboxd profile?{" "}
        <Link href="/" className="text-zinc-400 hover:text-gold">
          Use it instead
        </Link>{" "}
        for an auto-imported watched history.
      </p>
    </main>
  );
}
