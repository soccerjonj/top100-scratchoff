import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { ListView } from "@/components/ListView";
import { CsvUpload } from "@/components/CsvUpload";
import { ComparePartnerForm } from "@/components/ComparePartnerForm";
import type { ListId } from "@/types";
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
  const density: Density = rawDensity === "dense" ? "dense" : "comfy";

  let user;
  try {
    user = await getOrRefreshUser(username);
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) notFound();
    throw e;
  }

  const hasCsv = user.csvUploadedAt != null;

  return (
    <main className="mx-auto max-w-[1800px] px-4 py-8">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gold">{username}</span>
          </h1>
          <p className="text-sm text-zinc-500">
            {user.filmCount.toLocaleString()} films watched · last refreshed{" "}
            {timeAgo(new Date(user.lastScrapedAt))}
            {hasCsv && (
              <>
                {" "}· CSV imported {timeAgo(new Date(user.csvUploadedAt!))}
              </>
            )}
          </p>
        </div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-gold">
          ← change user
        </Link>
      </header>

      <div className="mb-6 flex flex-col gap-3">
        <CsvUpload username={username} hasCsv={hasCsv} />
        <ComparePartnerForm self={username} />
        <Link
          href={`/share/${username}/${activeList}`}
          className="self-start rounded-md border border-gold bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20"
        >
          ✨ Share this list →
        </Link>
      </div>

      <ListView
        activeList={activeList}
        watchedSlugs={user.watchedSlugs}
        username={username}
        density={density}
      />
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
