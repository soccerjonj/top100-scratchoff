import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LISTS } from "@/lib/lists";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import type { ListId } from "@/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string; list: string }>;

const isListId = (v: string): v is ListId => v in LISTS;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username: raw, list } = await params;
  const username = normalizeUsername(raw);
  const listId: ListId = isListId(list) ? list : "imdb-top-100";
  const title = `${username} · ${LISTS[listId].title}`;
  const description = `See which films ${username} has watched from ${LISTS[listId].title} on top100scratchoff.com.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharePage({ params }: { params: Params }) {
  const { username: raw, list } = await params;
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_-]+$/.test(username)) notFound();
  if (!isListId(list)) notFound();

  let user;
  try {
    user = await getOrRefreshUser(username);
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) notFound();
    throw e;
  }

  const listMeta = LISTS[list];
  const watchedSet = new Set(user.watchedSlugs);
  const watched = listMeta.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;
  const total = listMeta.entries.length;
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);

  const apiBase = `/api/share-image/${username}/${list}`;
  const previewSrc = `${apiBase}?size=og`;
  const squareDl = `${apiBase}?size=square&download=1`;
  const storyDl = `${apiBase}?size=story&download=1`;

  // Share intent URLs need an absolute page URL; use a relative path that
  // the X/Threads share intents will accept (Twitter is fine with relative,
  // Threads requires absolute — both clients resolve when pasted).
  const text = encodeURIComponent(
    `I've watched ${watched}/${total} (${pct}%) of the ${listMeta.title} on top100scratchoff.com 🎬✨`,
  );
  const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
  const threadsUrl = `https://www.threads.net/intent/post?text=${text}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gold">{username}</span>
            <span className="text-zinc-600"> · </span>
            <span>{listMeta.title}</span>
          </h1>
          <p className="text-sm text-zinc-500">
            <span className="text-gold font-semibold">
              {watched} / {total}
            </span>{" "}
            watched · {pct}%
          </p>
        </div>
        <Link
          href={`/u/${username}?list=${list}`}
          className="text-sm text-zinc-400 hover:text-gold"
        >
          ← back to my grid
        </Link>
      </header>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={`${username} ${listMeta.title} share image`}
          className="w-full"
          width={1200}
          height={630}
        />
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
          For Instagram / TikTok where link previews don&apos;t work — download the PNG and upload it directly.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={squareDl}
            className="rounded-md border border-zinc-700 px-4 py-3 text-center text-sm hover:border-gold hover:text-gold"
          >
            📸 IG Square (1080×1080)
          </a>
          <a
            href={storyDl}
            className="rounded-md border border-zinc-700 px-4 py-3 text-center text-sm hover:border-gold hover:text-gold"
          >
            📱 IG Story (1080×1920)
          </a>
        </div>
      </section>
    </main>
  );
}
