import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { ListView } from "@/components/ListView";
import type { ListId, UserRecord } from "@/types";

export const dynamic = "force-dynamic";

type Mode = "both" | "either";

type SearchParams = Promise<{ list?: string; mode?: string }>;
type Params = Promise<{ users: string[] }>;

function isListId(v: string | undefined): v is ListId {
  return v === "imdb-top-100" || v === "letterboxd-top-500";
}
function isMode(v: string | undefined): v is Mode {
  return v === "both" || v === "either";
}

function intersect(sets: Set<string>[]): string[] {
  if (sets.length === 0) return [];
  const [first, ...rest] = sets;
  return Array.from(first).filter((s) => rest.every((r) => r.has(s)));
}
function union(sets: Set<string>[]): string[] {
  const out = new Set<string>();
  for (const s of sets) for (const v of s) out.add(v);
  return Array.from(out);
}

export default async function TogetherPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { users: rawUsers } = await params;
  const { list, mode: rawMode } = await searchParams;

  const usernames = Array.from(
    new Set(rawUsers.map(normalizeUsername).filter(Boolean)),
  );
  if (usernames.length < 2) notFound();
  for (const u of usernames) {
    if (!/^[a-z0-9_-]+$/.test(u)) notFound();
  }

  const activeList: ListId = isListId(list) ? list : "imdb-top-100";
  const mode: Mode = isMode(rawMode) ? rawMode : "both";

  const records: UserRecord[] = [];
  for (const u of usernames) {
    try {
      records.push(await getOrRefreshUser(u));
    } catch (e) {
      if (e instanceof LetterboxdNotFoundError) notFound();
      throw e;
    }
  }

  const sets = records.map((r) => new Set(r.watchedSlugs));
  const slugs = mode === "both" ? intersect(sets) : union(sets);
  const headline = mode === "both" ? "both watched" : "either watched";

  const base = `/together/${usernames.join("/")}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {usernames.map((u, i) => (
              <span key={u}>
                {i > 0 && <span className="text-zinc-600"> + </span>}
                <Link href={`/u/${u}`} className="text-gold hover:underline">
                  {u}
                </Link>
              </span>
            ))}
          </h1>
          <p className="text-sm text-zinc-500">
            {slugs.length.toLocaleString()} films {headline} ·{" "}
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
        <Link href="/" className="text-sm text-zinc-400 hover:text-gold">
          ← start over
        </Link>
      </header>

      <nav className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`${base}?mode=both${list ? `&list=${list}` : ""}`}
          scroll={false}
          className={[
            "rounded-full border px-3 py-1 text-xs transition",
            mode === "both"
              ? "border-gold bg-gold/10 text-gold"
              : "border-zinc-700 text-zinc-400 hover:border-gold/50",
          ].join(" ")}
        >
          Both watched
        </Link>
        <Link
          href={`${base}?mode=either${list ? `&list=${list}` : ""}`}
          scroll={false}
          className={[
            "rounded-full border px-3 py-1 text-xs transition",
            mode === "either"
              ? "border-gold bg-gold/10 text-gold"
              : "border-zinc-700 text-zinc-400 hover:border-gold/50",
          ].join(" ")}
        >
          Either watched
        </Link>
      </nav>

      <div className="mb-6 text-xs text-zinc-500">
        {records.some((r) => !r.csvUploadedAt) && (
          <>
            Some users haven&apos;t imported their full Letterboxd history yet.{" "}
            {records
              .filter((r) => !r.csvUploadedAt)
              .map((r) => (
                <Link
                  key={r.username}
                  href={`/u/${r.username}`}
                  className="mr-2 text-gold underline"
                >
                  upload {r.username}&apos;s CSV
                </Link>
              ))}
          </>
        )}
      </div>

      <ListView
        activeList={activeList}
        watchedSlugs={slugs}
        username={usernames.join("/")}
        basePath={base}
      />
    </main>
  );
}
