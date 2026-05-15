import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LISTS } from "@/lib/lists";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import { effectiveWatchedSet, type ListId } from "@/types";
import { DownloadButton } from "@/components/DownloadButton";
import { PreviewWithProgress } from "@/components/PreviewWithProgress";

export const dynamic = "force-dynamic";

type Params = Promise<{ users: string[] }>;
type SearchParams = Promise<{ mode?: string }>;

const isListId = (v: string): v is ListId => v in LISTS;

function parseUrl(rawUsers: string[]): {
  usernames: string[];
  list: ListId;
} | null {
  if (rawUsers.length < 3) return null;
  const list = rawUsers[rawUsers.length - 1];
  if (!isListId(list)) return null;
  const usernames = rawUsers
    .slice(0, -1)
    .map(normalizeUsername)
    .filter(Boolean);
  for (const u of usernames) {
    if (!/^[a-z0-9_-]+$/.test(u)) return null;
  }
  if (usernames.length < 2) return null;
  return { usernames, list };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { users: rawUsers } = await params;
  const parsed = parseUrl(rawUsers);
  if (!parsed) return {};
  const { usernames, list } = parsed;
  const display = usernames.join(" × ");
  const title = `${display} · ${LISTS[list].title}`;
  const description = `See which films ${display} have both watched from ${LISTS[list].title} on top100scratchoff.com.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
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

export default async function TogetherSharePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { users: rawUsers } = await params;
  const { mode: rawMode } = await searchParams;
  const mode = rawMode === "either" ? "either" : "both";

  const parsed = parseUrl(rawUsers);
  if (!parsed) notFound();
  const { usernames, list } = parsed;

  // Resolve each user and compute the merged watched set.
  const records = [];
  for (const u of usernames) {
    try {
      records.push(await getOrRefreshUser(u));
    } catch (e) {
      if (e instanceof LetterboxdNotFoundError) notFound();
      throw e;
    }
  }
  const sets = records.map((r) => effectiveWatchedSet(r));
  const combined = mode === "both" ? intersect(sets) : union(sets);

  const listMeta = LISTS[list];
  const watched = listMeta.entries.filter((e) =>
    new Set(combined).has(e.letterboxdSlug),
  ).length;
  const total = listMeta.entries.length;
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);
  const headline = mode === "both" ? "both watched" : "either watched";
  const display = usernames.join(" × ");

  const apiBase = `/api/share-image/together/${usernames.join("/")}/${list}`;
  const params0 = `mode=${mode}`;
  const ogSrc = `${apiBase}?size=og&${params0}`;
  const squareSrc = `${apiBase}?size=square&${params0}`;
  const storySrc = `${apiBase}?size=story&${params0}`;

  // Share-intent text
  const verb = mode === "both" ? "We've both watched" : "Between us we've watched";
  const text = encodeURIComponent(
    `${verb} ${watched}/${total} (${pct}%) of the ${listMeta.title} on top100scratchoff.com 🎬✨`,
  );
  const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
  const threadsUrl = `https://www.threads.net/intent/post?text=${text}`;
  const backHref = `/together/${usernames.join("/")}?list=${list}${mode === "either" ? "&mode=either" : ""}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gold">{display}</span>
            <span className="text-zinc-600"> · </span>
            <span>{listMeta.title}</span>
          </h1>
          <p className="text-sm text-zinc-500">
            <span className="text-gold font-semibold">
              {watched} / {total}
            </span>{" "}
            {headline} · {pct}%
          </p>
        </div>
        <Link
          href={backHref}
          className="text-sm text-zinc-400 hover:text-gold"
        >
          ← back to the grid
        </Link>
      </header>

      <div className="mx-auto w-full max-w-[360px]">
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
          <PreviewWithProgress
            src={storySrc}
            alt={`${display} ${listMeta.title} IG Story share image`}
            width={1080}
            height={1920}
            className="block w-full"
          />
        </div>
      </div>

      <div aria-hidden="true" style={{ display: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ogSrc} alt="" width={1} height={1} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={squareSrc} alt="" width={1} height={1} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Share
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={xUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-gold px-4 py-3 text-center font-semibold text-black hover:bg-gold-dim"
          >
            Share on X (Twitter)
          </a>
          <a
            href={threadsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gold px-4 py-3 text-center font-semibold text-gold hover:bg-gold/10"
          >
            Share on Threads
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Download image
        </h2>
        <p className="text-xs text-zinc-600">
          For Instagram / TikTok where link previews don&apos;t work — download
          the PNG and upload it directly.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <DownloadButton
            href={squareSrc}
            filename={`${usernames.join("-")}-${list}-square.png`}
            className="rounded-md border border-zinc-700 px-4 py-3 text-center text-sm hover:border-gold hover:text-gold"
          >
            📸 IG Square (1080×1080)
          </DownloadButton>
          <DownloadButton
            href={storySrc}
            filename={`${usernames.join("-")}-${list}-story.png`}
            className="rounded-md border border-zinc-700 px-4 py-3 text-center text-sm hover:border-gold hover:text-gold"
          >
            📱 IG Story (1080×1920)
          </DownloadButton>
        </div>
      </section>
    </main>
  );
}
