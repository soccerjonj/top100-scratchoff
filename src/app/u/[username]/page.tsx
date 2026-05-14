import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { ListView } from "@/components/ListView";
import { CsvUpload } from "@/components/CsvUpload";
import { ComparePartnerForm } from "@/components/ComparePartnerForm";
import type { ListId } from "@/types";
import { effectiveWatchedSet } from "@/types";
import type { Density } from "@/components/PosterGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  const title = `${username} · Top 100 Scratch-Off`;
  const description = `Which films from the IMDB Top 100, AFI Top 100, NYT 100 Best of the 21st Century, and Letterboxd's Top 500 has ${username} watched?`;
  const ogImage = `/api/share-image/${username}/imdb-top-100?size=og`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

type SearchParams = Promise<{ list?: string; density?: string }>;
type Params = Promise<{ username: string }>;

function isListId(v: string | undefined): v is ListId {
  return (
    v === "imdb-top-100" ||
    v === "letterboxd-top-500" ||
    v === "nyt-top-100" ||
    v === "afi-top-100"
  );
}

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username: rawUsername } = await params;
  const { list: rawList, density: rawDensity } = await searchParams;
  const username = normalizeUsername(rawUsername);
  const activeList: ListId = isListId(rawList) ? rawList : "imdb-top-100";
  const density: Density = rawDensity === "comfy" ? "comfy" : "dense";

  let user;
  try {
    user = await getOrRefreshUser(username);
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) notFound();
    throw e;
  }

  const hasCsv = user.csvUploadedAt != null;
  const preloadHref = `/api/share-image/${username}/${activeList}?size=og`;
  // Apply manual overrides on top of scraped/CSV slugs.
  const effectiveWatched = Array.from(effectiveWatchedSet(user));

  return (
    <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-4 sm:py-8">
      <link rel="preload" as="image" href={preloadHref} />

      {/* Compact top row: identity + primary action (Share) */}
      <header className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold sm:text-2xl">
            <span className="text-gold">{username}</span>
          </h1>
          <p className="truncate text-xs text-zinc-500 sm:text-sm">
            {user.filmCount.toLocaleString()} films watched
            {hasCsv ? "" : " · page 1 only"}
          </p>
        </div>
        <Link
          href={`/share/${username}/${activeList}`}
          className="shrink-0 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-black hover:bg-gold-dim sm:px-4"
        >
          ✨ Share
        </Link>
      </header>

      {!hasCsv && (
        <a
          href="#csv-upload"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-xs transition hover:bg-gold/10 sm:text-sm"
        >
          <span className="text-zinc-300">
            Showing your <strong className="text-gold">72 most recent</strong>{" "}
            watches. Upload <code className="text-gold">watched.csv</code> from
            Letterboxd for your full history.
          </span>
          <span className="rounded bg-gold px-3 py-1 font-semibold text-black">
            Upload CSV ↓
          </span>
        </a>
      )}

      <ListView
        activeList={activeList}
        watchedSlugs={effectiveWatched}
        username={username}
        density={density}
        ownerUsername={username}
      />

      {/* Less-frequent actions live below the grid so they don't push posters off-screen on mobile */}
      <footer
        id="csv-upload"
        className="mt-10 flex flex-col gap-3 border-t border-zinc-900 pt-6 text-xs sm:flex-row sm:flex-wrap sm:items-start sm:gap-6"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-zinc-500 sm:basis-full">
          <span>Last refreshed {timeAgo(new Date(user.lastScrapedAt))}</span>
          {hasCsv && (
            <span>
              · CSV imported {timeAgo(new Date(user.csvUploadedAt!))}
            </span>
          )}
          <span className="grow" />
          <Link href="/" className="text-zinc-400 hover:text-gold">
            ← change user
          </Link>
        </div>
        <CsvUpload username={username} hasCsv={hasCsv} />
        <ComparePartnerForm self={username} />
      </footer>
    </main>
  );
}

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
