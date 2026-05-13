import { UsernameForm } from "@/components/UsernameForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        <span className="text-gold">Top 100</span> Scratch-Off
      </h1>
      <p className="max-w-md text-balance text-zinc-400">
        Enter your Letterboxd username to reveal which films you&apos;ve watched
        from the IMDB Top 100 and Letterboxd Top 500. Updated daily.
      </p>
      <UsernameForm />
      <p className="text-xs text-zinc-600">
        Your username is public. We scrape your public /films page only.
      </p>
    </main>
  );
}
