"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import type { FilmEntry } from "@/types";

interface PickerList {
  id: string;
  title: string;
  entries: FilmEntry[];
}

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

/**
 * Header button + dialog that picks a random film from one or more
 * lists with a slot-machine reveal. On /u the watched filter excludes
 * the viewer's watched set; on /together (extraWatchedSets passed)
 * it excludes anyone in the pair who has watched.
 */
export function RandomPickerButton({
  lists,
  watchedSlugs,
  extraWatchedSets = [],
}: {
  lists: PickerList[];
  /** Viewer's effective watched set (or, on /together, user[0]'s). */
  watchedSlugs: string[];
  /** Additional watched sets — on /together, the OTHER user(s). */
  extraWatchedSets?: string[][];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(lists.map((l) => l.id)),
  );
  const [unwatchedOnly, setUnwatchedOnly] = useState(true);
  const [phase, setPhase] = useState<"setup" | "rolling" | "revealed">("setup");
  const [shownEntry, setShownEntry] = useState<FilmEntry | null>(null);
  const [winner, setWinner] = useState<FilmEntry | null>(null);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const rollTimer = useRef<number | null>(null);
  const detailsAbort = useRef<AbortController | null>(null);

  // Watched union — used when filtering eligibility.
  const combinedWatched = useMemo(() => {
    const s = new Set(watchedSlugs);
    for (const extra of extraWatchedSets) for (const slug of extra) s.add(slug);
    return s;
  }, [watchedSlugs, extraWatchedSets]);

  // Eligible pool, deduped by letterboxd slug across all selected lists.
  const pool = useMemo(() => {
    const seen = new Set<string>();
    const out: FilmEntry[] = [];
    for (const l of lists) {
      if (!selected.has(l.id)) continue;
      for (const e of l.entries) {
        if (seen.has(e.letterboxdSlug)) continue;
        if (unwatchedOnly && combinedWatched.has(e.letterboxdSlug)) continue;
        seen.add(e.letterboxdSlug);
        out.push(e);
      }
    }
    return out;
  }, [lists, selected, unwatchedOnly, combinedWatched]);

  function openDialog() {
    const d = dialogRef.current;
    if (!d) return;
    setPhase("setup");
    setShownEntry(null);
    setWinner(null);
    setDetails(null);
    d.showModal();
    setOpen(true);
    document.body.style.overflow = "hidden";
  }
  function closeDialog() {
    cancelRoll();
    dialogRef.current?.close();
  }

  // Cleanup on unmount or close
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function onClose() {
      setOpen(false);
      document.body.style.overflow = "";
      cancelRoll();
      detailsAbort.current?.abort();
    }
    d.addEventListener("close", onClose);
    return () => {
      d.removeEventListener("close", onClose);
      cancelRoll();
    };
  }, []);

  function cancelRoll() {
    if (rollTimer.current) {
      window.clearTimeout(rollTimer.current);
      rollTimer.current = null;
    }
  }

  function handleDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) closeDialog();
  }

  function toggleList(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startRoll() {
    if (pool.length === 0) return;
    cancelRoll();
    // Pre-pick the winner.
    const w = pool[Math.floor(Math.random() * pool.length)];
    setWinner(w);
    setDetails(null);

    // Build a deck of ~24 ticks ending on the winner. Sample randomly
    // from the pool; if the pool is small, repeat with shuffling.
    const TICKS = 24;
    const deck: FilmEntry[] = [];
    for (let i = 0; i < TICKS - 1; i++) {
      // Pick any pool entry; allow duplicates for visual variety on
      // small pools.
      deck.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    deck.push(w);

    setPhase("rolling");

    // Cubic-ish ease-out delays. Tick i (0-indexed) shown after
    // delay = 50 + 430 * (i / (TICKS-1))^2.5 ms — totals ≈ 5s.
    let i = 0;
    function tick() {
      if (i >= deck.length) return;
      setShownEntry(deck[i]);
      const next = i + 1;
      if (next < deck.length) {
        const t = next / (deck.length - 1);
        const delay = 50 + 430 * Math.pow(t, 2.5);
        rollTimer.current = window.setTimeout(() => {
          i = next;
          tick();
        }, delay);
      } else {
        // Last tick: trigger reveal phase + fetch TMDB
        rollTimer.current = window.setTimeout(() => {
          setPhase("revealed");
          fetchDetails(w);
        }, 300);
      }
    }
    tick();
  }

  async function fetchDetails(entry: FilmEntry) {
    if (!entry.tmdbId) return;
    detailsAbort.current?.abort();
    const ac = new AbortController();
    detailsAbort.current = ac;
    setDetailsLoading(true);
    try {
      const r = await fetch(`/api/movie/${entry.tmdbId}`, {
        signal: ac.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as MovieDetails;
      if (!ac.signal.aborted) setDetails(j);
    } catch {
      // Quietly ignore — the reveal still shows title/year from the
      // entry itself.
    } finally {
      if (!ac.signal.aborted) setDetailsLoading(false);
    }
  }

  function rollAgain() {
    setShownEntry(null);
    setDetails(null);
    detailsAbort.current?.abort();
    startRoll();
  }

  const someSelected = selected.size > 0;
  const noneEligible = pool.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="shrink-0 rounded-md border border-gold bg-gold/10 px-3 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20 sm:px-4"
        aria-label="Pick a random movie"
      >
        Random
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        className="m-auto w-[min(420px,calc(100vw-1rem))] rounded-xl border border-zinc-800 bg-zinc-950 p-0 text-foreground shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="flex max-h-[90vh] flex-col overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                {phase === "revealed" ? "Your movie" : "Random pick"}
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-foreground"
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-4">
              {phase === "setup" && (
                <SetupBody
                  lists={lists}
                  selected={selected}
                  onToggle={toggleList}
                  unwatchedOnly={unwatchedOnly}
                  onUnwatchedChange={setUnwatchedOnly}
                  poolSize={pool.length}
                  noneEligible={noneEligible}
                  someSelected={someSelected}
                  onRoll={startRoll}
                  hasExtraWatched={extraWatchedSets.length > 0}
                />
              )}
              {phase === "rolling" && shownEntry && (
                <RollingBody entry={shownEntry} />
              )}
              {phase === "revealed" && winner && (
                <RevealBody
                  entry={winner}
                  details={details}
                  detailsLoading={detailsLoading}
                  onRollAgain={rollAgain}
                  onClose={closeDialog}
                />
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function SetupBody({
  lists,
  selected,
  onToggle,
  unwatchedOnly,
  onUnwatchedChange,
  poolSize,
  noneEligible,
  someSelected,
  onRoll,
  hasExtraWatched,
}: {
  lists: PickerList[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  unwatchedOnly: boolean;
  onUnwatchedChange: (v: boolean) => void;
  poolSize: number;
  noneEligible: boolean;
  someSelected: boolean;
  onRoll: () => void;
  hasExtraWatched: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
          Pull from these lists
        </div>
        <div className="flex flex-col gap-1.5">
          {lists.map((l) => (
            <label
              key={l.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-sm hover:border-zinc-700"
            >
              <input
                type="checkbox"
                checked={selected.has(l.id)}
                onChange={() => onToggle(l.id)}
                className="h-4 w-4 accent-gold"
              />
              <span className="min-w-0 flex-1 truncate text-foreground">
                {l.title}
              </span>
              <span className="text-[10px] text-zinc-600">
                {l.entries.length}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
          Filter
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-sm hover:border-zinc-700">
            <input
              type="radio"
              name="watched-filter"
              checked={unwatchedOnly}
              onChange={() => onUnwatchedChange(true)}
              className="h-4 w-4 accent-gold"
            />
            <span>
              <span className="text-foreground">
                {hasExtraWatched ? "Neither of us has watched" : "Unwatched only"}
              </span>
              <span className="ml-1 text-[10px] text-zinc-600">(default)</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-sm hover:border-zinc-700">
            <input
              type="radio"
              name="watched-filter"
              checked={!unwatchedOnly}
              onChange={() => onUnwatchedChange(false)}
              className="h-4 w-4 accent-gold"
            />
            <span className="text-foreground">Include all movies</span>
          </label>
        </div>
      </div>

      {noneEligible ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          {someSelected
            ? unwatchedOnly
              ? "Nothing left to pick from — every film in the selected lists has been watched. Try toggling to “Include all movies”."
              : "No films available in the selected lists."
            : "Select at least one list."}
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500">
          {poolSize.toLocaleString()} film{poolSize === 1 ? "" : "s"} eligible
        </p>
      )}

      <button
        type="button"
        onClick={onRoll}
        disabled={noneEligible}
        className="rounded-lg bg-gold px-4 py-3 text-base font-semibold text-black transition hover:bg-gold-dim disabled:cursor-not-allowed disabled:opacity-50"
      >
        Pick a movie
      </button>
    </div>
  );
}

function RollingBody({ entry }: { entry: FilmEntry }) {
  const src = entry.posterPath
    ? `https://image.tmdb.org/t/p/w342${entry.posterPath}`
    : null;
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-md bg-zinc-900 shadow-lg ring-1 ring-zinc-800">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-700">
            no poster
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="truncate text-sm font-medium text-zinc-300">
          {entry.title}
        </div>
        <div className="text-xs text-zinc-500">{entry.year || "—"}</div>
      </div>
      <div className="text-xs uppercase tracking-widest text-gold/80">
        Rolling…
      </div>
    </div>
  );
}

function RevealBody({
  entry,
  details,
  detailsLoading,
  onRollAgain,
  onClose,
}: {
  entry: FilmEntry;
  details: MovieDetails | null;
  detailsLoading: boolean;
  onRollAgain: () => void;
  onClose: () => void;
}) {
  const src = entry.posterPath
    ? `https://image.tmdb.org/t/p/w342${entry.posterPath}`
    : null;
  const lbHref = `https://letterboxd.com/film/${entry.letterboxdSlug}/`;
  return (
    <div className="flex flex-col gap-3">
      <div className="picker-pop flex items-start gap-3">
        <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-gold/40 sm:w-28">
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={`${entry.title} poster`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-zinc-700">
              no poster
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight sm:text-lg">
            {entry.title}
          </h2>
          <div className="mt-0.5 text-xs text-zinc-400 sm:text-sm">
            {entry.year || ""}
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
      </div>

      {details?.tagline && (
        <div className="text-xs italic text-zinc-400">
          &ldquo;{details.tagline}&rdquo;
        </div>
      )}

      {details?.overview ? (
        <p className="max-h-[180px] overflow-y-auto text-xs leading-relaxed text-zinc-300 sm:text-sm">
          {details.overview}
        </p>
      ) : detailsLoading ? (
        <div className="space-y-2">
          <div className="h-2.5 w-full animate-pulse rounded bg-zinc-800" />
          <div className="h-2.5 w-10/12 animate-pulse rounded bg-zinc-800" />
          <div className="h-2.5 w-7/12 animate-pulse rounded bg-zinc-800" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <a
          href={lbHref}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-md bg-gold px-3 py-2 text-center text-sm font-semibold text-black hover:bg-gold-dim"
        >
          View on Letterboxd ↗
        </a>
        <button
          type="button"
          onClick={onRollAgain}
          className="rounded-md border border-gold px-3 py-2 text-center text-sm font-medium text-gold hover:bg-gold/10"
        >
          Roll again
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-300 hover:border-zinc-500"
        >
          Close
        </button>
      </div>
    </div>
  );
}
