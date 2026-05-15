import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { TogetherSwitcher } from "@/components/TogetherSwitcher";
import { TogetherShareButton } from "@/components/TogetherShareButton";
import { RememberMe } from "@/components/RememberMe";
import type { ListId, UserRecord } from "@/types";
import { effectiveWatchedSet } from "@/types";
import type { Density } from "@/components/PosterGrid";

export const dynamic = "force-dynamic";

type Mode = "both" | "either";

type SearchParams = Promise<{ list?: string; mode?: string; density?: string }>;
type Params = Promise<{ users: string[] }>;

function isListId(v: string | undefined): v is ListId {
  return (
    v === "imdb-top-100" ||
    v === "letterboxd-top-500" ||
    v === "nyt-top-100" ||
    v === "afi-top-100"
  );
}
function isMode(v: string | undefined): v is Mode {
  return v === "both" || v === "either";
}

export default async function TogetherPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { users: rawUsers } = await params;
  const { list, mode: rawMode, density: rawDensity } = await searchParams;

  const usernames = Array.from(
    new Set(rawUsers.map(normalizeUsername).filter(Boolean)),
  );
  if (usernames.length < 2) notFound();
  for (const u of usernames) {
    if (!/^[a-z0-9_-]+$/.test(u)) notFound();
  }

  const activeList: ListId = isListId(list) ? list : "imdb-top-100";
  const mode: Mode = isMode(rawMode) ? rawMode : "both";
  const density: Density = rawDensity === "comfy" ? "comfy" : "dense";

  const records: UserRecord[] = [];
  for (const u of usernames) {
    try {
      records.push(await getOrRefreshUser(u));
    } catch (e) {
      if (e instanceof LetterboxdNotFoundError) notFound();
      throw e;
    }
  }

  // Per-user effective watched arrays — TogetherSwitcher does the
  // intersect/union client-side as the user flips mode.
  const userWatched = records.map((r) =>
    Array.from(effectiveWatchedSet(r)),
  );

  return (
    <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-4 sm:py-8">
      <RememberMe username={usernames[0]} partner={usernames[1]} />
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold sm:text-2xl">
            {usernames.map((u, i) => (
              <span key={u}>
                {i > 0 && <span className="text-zinc-600"> × </span>}
                <Link href={`/u/${u}`} className="text-gold hover:underline">
                  {u}
                </Link>
              </span>
            ))}
          </h1>
          <p className="truncate text-xs text-zinc-500 sm:text-sm">
            {records.map((r, i) => (
              <span key={r.username}>
                {i > 0 && " · "}
                {r.username}: {r.filmCount.toLocaleString()}
                {!r.csvUploadedAt && (
                  <span className="text-amber-500/70"> (page 1 only)</span>
                )}
              </span>
            ))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <TogetherShareButton
            usernames={usernames}
            initialList={activeList}
            initialMode={mode}
          />
          <Link href="/" className="hidden text-sm text-zinc-400 hover:text-gold sm:inline">
            ← start over
          </Link>
        </div>
      </header>

      {records.some((r) => !r.csvUploadedAt) && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-zinc-300">
          {records
            .filter((r) => !r.csvUploadedAt)
            .map((r) => r.username)
            .join(" and ")}{" "}
          {records.filter((r) => !r.csvUploadedAt).length === 1
            ? "hasn't"
            : "haven't"}{" "}
          uploaded their full Letterboxd history yet —{" "}
          {records
            .filter((r) => !r.csvUploadedAt)
            .map((r, i, arr) => (
              <span key={r.username}>
                <Link
                  href={`/u/${r.username}`}
                  className="text-gold underline-offset-2 hover:underline"
                >
                  upload {r.username}&apos;s CSV
                </Link>
                {i < arr.length - 1 && " · "}
              </span>
            ))}
        </div>
      )}

      <TogetherSwitcher
        usernames={usernames}
        userWatched={userWatched}
        initialList={activeList}
        initialMode={mode}
        initialDensity={density}
      />
    </main>
  );
}
