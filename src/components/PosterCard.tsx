"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { FilmEntry } from "@/types";

interface MovieDetails {
  title: string;
  overview: string;
  year: number | null;
  runtime: number | null;
  voteAverage: number;
  genres: string[];
  tagline: string;
  posterPath: string | null;
  backdropPath: string | null;
}

export function PosterCard({
  entry,
  watched,
  listTitle,
  ownerUsername,
}: {
  entry: FilmEntry;
  watched: boolean;
  listTitle?: string;
  /**
   * The username(s) the toggle should write to. Single string → solo
   * /u/[username] view. Array of usernames → /together view, where
   * toggling fans out to each user's record in parallel so a single
   * tap covers "both of us".
   */
  ownerUsername?: string | string[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  // Optimistic state for the manual toggle — flips immediately on click,
  // then router.refresh() pulls the real state from Mongo.
  const [optimisticWatched, setOptimisticWatched] = useState<boolean | null>(
    null,
  );
  const [toggling, setToggling] = useState(false);
  const effectiveWatched = optimisticWatched ?? watched;

  async function openDialog() {
    const d = dialogRef.current;
    if (!d) return;
    d.showModal();
    if (!details && entry.tmdbId && loadState === "idle") {
      setLoadState("loading");
      try {
        const r = await fetch(`/api/movie/${entry.tmdbId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as MovieDetails;
        setDetails(j);
        setLoadState("idle");
      } catch {
        setLoadState("error");
      }
    }
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  // Close on backdrop click — the click target is the <dialog> itself
  // only when the click landed on the backdrop, not inside the content.
  function handleDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) closeDialog();
  }

  // Prevent body scroll while dialog is open
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function lock() {
      document.body.style.overflow = "hidden";
    }
    function unlock() {
      document.body.style.overflow = "";
    }
    // Native <dialog> has no close event in all browsers, polyfill via close listener.
    d.addEventListener("close", unlock);
    return () => {
      d.removeEventListener("close", unlock);
      unlock();
    };
  }, []);

  const lbHref = `https://letterboxd.com/film/${entry.letterboxdSlug}/`;
  const bigPosterSrc = entry.posterPath
    ? `https://image.tmdb.org/t/p/w500${entry.posterPath}`
    : null;

  const ownerList: string[] = !ownerUsername
    ? []
    : Array.isArray(ownerUsername)
      ? ownerUsername
      : [ownerUsername];
  const isMultiOwner = ownerList.length > 1;

  async function toggleManualWatched() {
    if (ownerList.length === 0 || toggling) return;
    const next = !effectiveWatched;
    setOptimisticWatched(next);
    setToggling(true);
    try {
      const results = await Promise.all(
        ownerList.map((u) =>
          fetch(`/api/user/${u}/manual-watch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: entry.letterboxdSlug, watched: next }),
          }),
        ),
      );
      if (results.some((r) => !r.ok)) {
        throw new Error("one or more updates failed");
      }
      // Background refresh: tells the route segment to re-render with the
      // updated Mongo data. The optimistic state stays until the page
      // re-renders with the real watched prop.
      router.refresh();
    } catch (err) {
      console.error("manual-watch toggle failed", err);
      setOptimisticWatched(null); // revert
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openDialog();
          document.body.style.overflow = "hidden";
        }}
        className={[
          "poster-card group relative block aspect-[2/3] overflow-hidden rounded-md ring-1 ring-zinc-800 text-left",
          watched ? "poster-watched hover:ring-gold" : "poster-unwatched hover:opacity-90",
        ].join(" ")}
        title={`${entry.title} (${entry.year})`}
      >
        {entry.posterPath ? (
          /* Direct TMDB CDN — skips the /_next/image proxy hop, hits a
             long-cached CDN, and renders instantly when the bytes are in
             the browser cache. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w185${entry.posterPath}`}
            alt={`${entry.title} (${entry.year}) poster`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-[10px] text-zinc-600">
            no poster
          </div>
        )}
        <div className="absolute left-0.5 top-0.5 rounded bg-black/70 px-1 py-0 text-[8px] font-semibold text-gold sm:left-1 sm:top-1 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
          #{entry.rank}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="truncate text-xs font-medium">{entry.title}</div>
          <div className="text-[10px] text-zinc-400">{entry.year}</div>
        </div>
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        className="movie-dialog m-auto w-[min(640px,calc(100vw-1rem))] rounded-xl border border-zinc-800 bg-zinc-950 p-0 text-foreground shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[85vh] overflow-hidden">
          {/* Poster column — small fixed width on mobile, larger on desktop. */}
          <div className="relative aspect-[2/3] w-24 shrink-0 self-start bg-zinc-900 sm:w-56">
            {bigPosterSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={bigPosterSrc}
                alt={`${entry.title} poster`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-zinc-700">
                no poster
              </div>
            )}
          </div>

          {/* Details column */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 sm:gap-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 sm:text-xs">
                  {listTitle ? `#${entry.rank} in ${listTitle}` : `#${entry.rank}`}
                </div>
                <h2 className="text-base font-bold leading-tight sm:text-2xl">
                  {entry.title}
                </h2>
                <div className="mt-0.5 text-xs text-zinc-400 sm:mt-1 sm:text-sm">
                  {entry.year}
                  {details?.runtime ? (
                    <>
                      {" · "}
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                    </>
                  ) : null}
                  {details?.voteAverage ? (
                    <>
                      {" · "}
                      <span className="text-gold">★</span>{" "}
                      {details.voteAverage.toFixed(1)}
                    </>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-foreground"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {effectiveWatched ? (
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">
                  ✨ Watched
                </div>
              ) : (
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400">
                  Not watched yet
                </div>
              )}
              {ownerList.length > 0 && (
                <button
                  type="button"
                  onClick={toggleManualWatched}
                  disabled={toggling}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400 transition hover:border-gold/50 hover:text-gold disabled:opacity-50"
                >
                  {toggling
                    ? "Saving…"
                    : effectiveWatched
                      ? isMultiOwner
                        ? "Mark unwatched (both)"
                        : "Mark unwatched"
                      : isMultiOwner
                        ? "✓ Mark both watched"
                        : "✓ Mark watched"}
                </button>
              )}
            </div>
            {ownerList.length > 0 && !watched && optimisticWatched === null && (
              <p className="text-[10px] text-zinc-600">
                {isMultiOwner
                  ? `Marks save to both ${ownerList.join(" and ")} — handy when one of you forgot to log a film.`
                  : "Manual marks save to your record — useful if you don't use Letterboxd or it's missing from your export."}
              </p>
            )}

            {details?.tagline && (
              <div className="text-xs italic text-zinc-400 sm:text-sm">
                &ldquo;{details.tagline}&rdquo;
              </div>
            )}

            {details?.overview ? (
              <p className="text-xs leading-relaxed text-zinc-300 sm:text-sm">
                {details.overview}
              </p>
            ) : loadState === "loading" ? (
              <div className="space-y-2">
                <div className="h-2.5 w-full animate-pulse rounded bg-zinc-800" />
                <div className="h-2.5 w-11/12 animate-pulse rounded bg-zinc-800" />
                <div className="h-2.5 w-8/12 animate-pulse rounded bg-zinc-800" />
              </div>
            ) : loadState === "error" ? (
              <p className="text-xs text-zinc-500">
                Couldn&apos;t load extra details from TMDB.
              </p>
            ) : null}

            {details?.genres && details.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {details.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:pt-2">
              <a
                href={lbHref}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-md bg-gold px-3 py-2 text-center text-xs font-semibold text-black hover:bg-gold-dim sm:px-4 sm:py-2.5 sm:text-sm"
              >
                View on Letterboxd ↗
              </a>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-zinc-700 px-3 py-2 text-center text-xs text-zinc-300 hover:border-zinc-500 sm:px-4 sm:py-2.5 sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
