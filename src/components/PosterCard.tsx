"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

// Sparkle particles emitted on watched flip. Pre-baked offsets give a
// natural spread without needing Math.random at render time.
const SPARKLES: ReadonlyArray<{ dx: number; dy: number; delay: number; dur: number }> = [
  { dx: -28, dy: -42, delay: 0,   dur: 720 },
  { dx:  32, dy: -38, delay: 50,  dur: 780 },
  { dx: -14, dy: -54, delay: 110, dur: 700 },
  { dx:  18, dy: -28, delay: 160, dur: 760 },
];

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
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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

  // Re-mount key for the modal contents so the spring entrance plays
  // every time the dialog opens (not just the first time).
  const [openCount, setOpenCount] = useState(0);

  // Track watched flips for the celebration overlay. Mount the sheen +
  // sparkles for ~750ms whenever effectiveWatched goes false → true.
  const prevWatchedRef = useRef(effectiveWatched);
  const [celebrate, setCelebrate] = useState(false);
  // Distinguish user-initiated toggles from passive state changes
  // (e.g. a parent re-render after data sync) so we don't fire the
  // badge animation on initial mount when watched is already true.
  const [badgeToggled, setBadgeToggled] = useState(false);

  useEffect(() => {
    if (!prevWatchedRef.current && effectiveWatched && !reduceMotion) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 800);
      prevWatchedRef.current = effectiveWatched;
      return () => clearTimeout(t);
    }
    prevWatchedRef.current = effectiveWatched;
  }, [effectiveWatched, reduceMotion]);

  async function openDialog() {
    const d = dialogRef.current;
    if (!d) return;
    setOpenCount((n) => n + 1);
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
    function unlock() {
      document.body.style.overflow = "";
    }
    d.addEventListener("close", unlock);
    return () => {
      d.removeEventListener("close", unlock);
      unlock();
    };
  }, []);

  // Cursor-tracked gold spotlight. We write CSS custom properties
  // directly to the element so the gradient re-paints without React
  // re-rendering on every mousemove.
  function handleMouseMove(e: MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  }

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
    setBadgeToggled(true);
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
        ref={buttonRef}
        type="button"
        onClick={() => {
          openDialog();
          document.body.style.overflow = "hidden";
        }}
        onMouseMove={handleMouseMove}
        className={[
          "poster-card group relative block aspect-[2/3] overflow-hidden rounded-md ring-1 ring-zinc-800 text-left",
          watched ? "poster-watched hover:ring-gold" : "poster-unwatched",
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
        {/* Cursor-tracked gold spotlight overlay (pointer-only, CSS-driven) */}
        <span className="poster-spotlight" aria-hidden />

        <div className="poster-rank absolute left-0.5 top-0.5 z-[2] rounded bg-black/70 px-1 py-0 text-[8px] font-semibold text-gold sm:left-1 sm:top-1 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
          #{entry.rank}
        </div>
        <div className="poster-title pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/90 to-transparent p-2">
          <div className="truncate text-xs font-medium">{entry.title}</div>
          <div className="text-[10px] text-zinc-400">{entry.year}</div>
        </div>

        {/* Watched-flip celebration: sheen sweep + sparkles. Mounted only
            while `celebrate` is true (≈750ms), then unmounts cleanly. */}
        {celebrate && (
          <>
            <span className="poster-sheen" aria-hidden />
            {SPARKLES.map((s, i) => (
              <span
                key={i}
                className="poster-sparkle"
                aria-hidden
                style={
                  {
                    "--dx": `${s.dx}px`,
                    "--dy": `${s.dy}px`,
                    "--delay": `${s.delay}ms`,
                    "--dur": `${s.dur}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </>
        )}
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        className="movie-dialog m-auto w-[min(560px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0 text-foreground shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <motion.div
          key={openCount}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 340,
            damping: 28,
            mass: 0.6,
          }}
          className="flex max-h-[88vh] flex-col overflow-hidden"
        >
          {/* HERO — the film's own backdrop, full-bleed, with a scrim that
              fades into the body. Falls back to a blurred poster until the
              backdrop loads (or permanently when a film has no backdrop),
              then to a gold gradient if there's no art at all. */}
          <div className="relative aspect-[16/9] w-full shrink-0 bg-zinc-900">
            {details?.backdropPath ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://image.tmdb.org/t/p/w780${details.backdropPath}`}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : bigPosterSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={bigPosterSrc}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-zinc-900 to-zinc-950" />
            )}
            {/* Scrim → blends the backdrop into the solid body */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/5" />
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/45 p-1.5 text-white/90 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* TITLE ROW — poster card overlaps the hero seam */}
          <div className="relative z-10 -mt-16 flex items-end gap-3 px-4 sm:-mt-20 sm:gap-4 sm:px-6">
            <div className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg shadow-xl shadow-black/60 ring-1 ring-white/10 sm:w-28">
              {bigPosterSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={bigPosterSrc}
                  alt={`${entry.title} poster`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-800 text-[10px] text-zinc-600">
                  no poster
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="text-[10px] font-medium uppercase tracking-wider text-gold/80 sm:text-xs">
                {listTitle ? `#${entry.rank} · ${listTitle}` : `#${entry.rank}`}
              </div>
              <h2 className="font-display text-xl font-bold leading-tight sm:text-3xl">
                {entry.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 sm:text-sm">
                <span>{entry.year}</span>
                {details?.runtime ? (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span>
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                    </span>
                  </>
                ) : null}
                {details?.voteAverage ? (
                  <span className="inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 font-semibold text-gold">
                    ★ {details.voteAverage.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* BODY — scrollable */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <AnimatePresence mode="wait" initial={false}>
                {effectiveWatched ? (
                  <motion.div
                    key="watched"
                    initial={
                      badgeToggled && !reduceMotion
                        ? { scale: 0.7, opacity: 0 }
                        : false
                    }
                    animate={{ scale: 1, opacity: 1 }}
                    exit={reduceMotion ? undefined : { scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 460, damping: 24 }}
                    className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold"
                  >
                    <motion.svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <motion.path
                        d="M5 13l4 4L19 7"
                        initial={
                          badgeToggled && !reduceMotion
                            ? { pathLength: 0, opacity: 0 }
                            : false
                        }
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.32, ease: "easeOut", delay: 0.08 }}
                      />
                    </motion.svg>
                    Watched
                  </motion.div>
                ) : (
                  <motion.div
                    key="unwatched"
                    initial={false}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400"
                  >
                    Not watched yet
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {details?.tagline && (
              <div className="border-l-2 border-gold/40 pl-3 text-sm italic text-zinc-300">
                &ldquo;{details.tagline}&rdquo;
              </div>
            )}

            {details?.overview ? (
              <p className="text-sm leading-relaxed text-zinc-300">
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

            <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
              {ownerList.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={toggleManualWatched}
                    disabled={toggling}
                    className="flex-1 rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-gold-dim disabled:opacity-50"
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
                  <a
                    href={lbHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm text-zinc-300 transition hover:border-gold hover:text-gold"
                  >
                    Letterboxd ↗
                  </a>
                </>
              ) : (
                <a
                  href={lbHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-gold-dim"
                >
                  View on Letterboxd ↗
                </a>
              )}
            </div>
            {ownerList.length > 0 && !watched && optimisticWatched === null && (
              <p className="text-[10px] text-zinc-600">
                {isMultiOwner
                  ? `Marks save to both ${ownerList.join(" and ")} — handy when one of you forgot to log a film.`
                  : "Manual marks save to your record — useful if you don't use Letterboxd or it's missing from your export."}
              </p>
            )}
          </div>
        </motion.div>
      </dialog>
    </>
  );
}
