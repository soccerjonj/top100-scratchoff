import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { TogetherSwitcher } from "@/components/TogetherSwitcher";
import { TogetherShareButton } from "@/components/TogetherShareButton";
import { RememberMe } from "@/components/RememberMe";
import { getCustomListsForUser } from "@/lib/custom-list";
import type { CustomListRecord, ListId, UserRecord } from "@/types";
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
const isCustomId = (v: string): boolean => /^[0-9a-f]{16}$/.test(v);

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

  // Active list can be a built-in or a custom-list id. The switcher
  // validates against the actual set at render time.
  const rawListClean = typeof list === "string" ? list : "";
  const activeList: string = isListId(list)
    ? list
    : isCustomId(rawListClean)
      ? rawListClean
      : "imdb-top-100";
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

  // Union of every participant's pinned custom lists. If two users have
  // the same list pinned, getCustomListsForUser is naturally deduped
  // because Mongo returns a single record per id.
  const allCustomListIds = Array.from(
    new Set(records.flatMap((r) => r.customListIds ?? [])),
  );
  const customLists: CustomListRecord[] =
    allCustomListIds.length > 0
      ? await getCustomListsForUser(allCustomListIds)
      : [];

  // Custom-list share image isn't supported yet, so the Share button
  // falls back to imdb-top-100 whenever a custom list is active.
  const sharableList: ListId = isListId(list) ? list : "imdb-top-100";

  return (
    <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-4 sm:py-8">
      <RememberMe
        username={usernames[0]}
        partner={usernames[1]}
        group={usernames}
      />
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
                  <span className="text-amber-500/70"> (recent only)</span>
                )}
              </span>
            ))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <TogetherShareButton
            usernames={usernames}
            initialList={sharableList}
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
        customLists={customLists}
      />
    </main>
  );
}
