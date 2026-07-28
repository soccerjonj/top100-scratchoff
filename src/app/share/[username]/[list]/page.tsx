import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LISTS } from "@/lib/lists";
import { getOrRefreshUser, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";
import type { ListId } from "@/types";
import { DownloadButton } from "@/components/DownloadButton";
import { PreviewWithProgress } from "@/components/PreviewWithProgress";
import { ShareIcon } from "@/components/ShareIcon";

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
  const description = `See which films ${username} has watched from ${LISTS[listId].title} on wellwatched.app.`;
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
  const ogSrc = `${apiBase}?size=og`;
  const storySrc = `${apiBase}?size=story`;

  // Share intent URLs need an absolute page URL; use a relative path that
  // the X/Threads share intents will accept (Twitter is fine with relative,
  // Threads requires absolute — both clients resolve when pasted).
  const text = encodeURIComponent(
    `I've watched ${watched}/${total} (${pct}%) of the ${listMeta.title} on wellwatched.app`,
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

      {/* Visible preview is the IG Story (1080×1920) since that's the
          most common share target. Scaled down to a portrait frame so
          desktop viewers don't need to scroll. PreviewWithProgress
          shows an animated % overlay until the image actually loads so
          users don't think the page is broken during the first render. */}
      <div className="mx-auto w-full max-w-[360px]">
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
          <PreviewWithProgress
            src={storySrc}
            alt={`${username} ${listMeta.title} IG Story share image`}
            width={1080}
            height={1920}
            className="block w-full"
          />
        </div>
      </div>

      {/* Hidden pre-warm for the OG size (used in link-preview metadata).
          The story preview above already triggers a story render in the
          foreground, so by the time the user taps Save / Share, the CDN
          has cached both sizes (Cache-Control: s-maxage=300). */}
      <div aria-hidden="true" style={{ display: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ogSrc} alt="" width={1} height={1} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Share image
        </h2>
        <DownloadButton
          href={storySrc}
          filename={`${username}-${list}-story.png`}
          shareText={decodeURIComponent(text)}
          shareUrl={`/share/${username}/${list}`}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-4 text-center text-base font-semibold text-black transition hover:bg-gold-dim"
        >
          <ShareIcon size={18} />
          Share
        </DownloadButton>
      </section>

      <section className="flex flex-col gap-3 border-t border-zinc-900 pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Or post the link
        </h2>
        <p className="text-xs text-zinc-500">
          X and Threads auto-render the gold link-preview card from this
          page — cleaner for tweets / Threads posts where you don&apos;t
          want a raw image attachment.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={xUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm text-zinc-300 transition hover:border-gold hover:text-gold"
          >
            Share on X
          </a>
          <a
            href={threadsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm text-zinc-300 transition hover:border-gold hover:text-gold"
          >
            Share on Threads
          </a>
        </div>
      </section>
    </main>
  );
}
