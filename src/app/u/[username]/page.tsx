import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { ListView } from "@/components/ListView";
import { CsvUpload } from "@/components/CsvUpload";
import { ComparePartnerForm } from "@/components/ComparePartnerForm";
import type { ListId } from "@/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ list?: string }>;
type Params = Promise<{ username: string }>;

function isListId(v: string | undefined): v is ListId {
  return v === "imdb-top-100" || v === "letterboxd-top-500";
}

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username: rawUsername } = await params;
  const { list: rawList } = await searchParams;
  const username = normalizeUsername(rawUsername);
  const activeList: ListId = isListId(rawList) ? rawList : "imdb-top-100";

  let user;
  try {
    user = await getOrRefreshUser(username);
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) notFound();
    throw e;
  }

  const hasCsv = user.csvUploadedAt != null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
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
      </div>

      <ListView activeList={activeList} watchedSlugs={user.watchedSlugs} username={username} />
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
