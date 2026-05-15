"use client";

import { useEffect, useMemo, useState } from "react";
import { LISTS } from "@/lib/lists";
import type { FilmEntry, ListId } from "@/types";
import { PosterGrid, type Density } from "./PosterGrid";
import { ProgressBar } from "./ProgressBar";
import { PosterPreloader } from "./PosterPreloader";

const BUILT_IN_ORDER: ListId[] = [
  "imdb-top-100",
  "afi-top-100",
  "nyt-top-100",
  "letterboxd-top-500",
];

const SHORT_TITLE: Record<ListId, string> = {
  "imdb-top-100": "IMDB 100",
  "afi-top-100": "AFI 100",
  "nyt-top-100": "NYT 21st",
  "letterboxd-top-500": "Letterboxd 500",
};

type Mode = "both" | "either";

/**
 * Tab/mode/density switching for /together, all client-side. Same
 * principle as ListSwitcher (every grid rendered upfront, only one
 * visible) plus:
 *  - "Both / Either" mode toggle computes intersection or union of
 *    the users' watched sets client-side — instant
 *  - The active list/mode/density stay in sync with the URL via
 *    history.replaceState
 */
export function TogetherSwitcher({
  usernames,
  userWatched,
  initialList,
  initialMode,
  initialDensity,
}: {
  usernames: string[];
  /** Each user's effective watched slug set, same order as usernames. */
  userWatched: string[][];
  initialList: ListId;
  initialMode: Mode;
  initialDensity: Density;
}) {
  const [activeId, setActiveId] = useState<ListId>(initialList);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [density, setDensity] = useState<Density>(initialDensity);

  // Build the per-user sets once; recompute combined set whenever mode flips.
  const userSets = useMemo(
    () => userWatched.map((slugs) => new Set(slugs)),
    [userWatched],
  );
  const watchedSet = useMemo(() => {
    if (mode === "both") return intersect(userSets);
    return union(userSets);
  }, [userSets, mode]);

  useEffect(() => {
    function sync() {
      const url = new URL(window.location.href);
      const l = url.searchParams.get("list");
      const m = url.searchParams.get("mode");
      const d = url.searchParams.get("density") as Density | null;
      if (l && BUILT_IN_ORDER.includes(l as ListId))
        setActiveId(l as ListId);
      if (m === "both" || m === "either") setMode(m);
      if (d === "comfy" || d === "dense") setDensity(d);
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function updateUrl(next: { list?: ListId; mode?: Mode; density?: Density }) {
    const url = new URL(window.location.href);
    if (next.list) url.searchParams.set("list", next.list);
    if (next.mode) {
      if (next.mode === "both") url.searchParams.delete("mode");
      else url.searchParams.set("mode", next.mode);
    }
    if (next.density) {
      if (next.density === "dense") url.searchParams.delete("density");
      else url.searchParams.set("density", next.density);
    }
    window.history.replaceState({}, "", url.toString());
  }

  function activateList(id: ListId) {
    if (id === activeId) return;
    setActiveId(id);
    updateUrl({ list: id });
    window.dispatchEvent(
      new CustomEvent("top100:listchange", { detail: { id } }),
    );
  }
  function activateMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    updateUrl({ mode: m });
  }
  function activateDensity(d: Density) {
    if (d === density) return;
    setDensity(d);
    updateUrl({ density: d });
  }

  const activeList = LISTS[activeId];
  const watchedInList = activeList.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;
  const headline = mode === "both" ? "both watched" : "either watched";

  return (
    <div className="flex flex-col gap-4">
      {/* List tabs */}
      <nav className="-mx-3 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-3 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {BUILT_IN_ORDER.map((id) => {
          const isActive = id === activeId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => activateList(id)}
              className={[
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition sm:px-4 sm:text-sm",
                isActive
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-zinc-700 text-zinc-400 hover:border-gold/50 hover:text-gold/80",
              ].join(" ")}
            >
              <span className="sm:hidden">{SHORT_TITLE[id]}</span>
              <span className="hidden sm:inline">{LISTS[id].title}</span>
            </button>
          );
        })}
      </nav>

      {/* Mode toggle (Both / Either) */}
      <nav className="flex flex-wrap gap-2">
        {(["both", "either"] as const).map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              onClick={() => activateMode(m)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition",
                active
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-zinc-700 text-zinc-400 hover:border-gold/50",
              ].join(" ")}
            >
              {m === "both" ? "Both watched" : "Either watched"}
            </button>
          );
        })}
      </nav>

      {/* Source link + remove (n/a) + density */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeList.sourceUrl && (
            <a
              href={activeList.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-gold hover:text-gold sm:text-sm"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {activeList.sourceLabel ?? "View on Letterboxd"}
            </a>
          )}
        </div>
        <nav className="flex items-center gap-1 text-xs">
          <span className="hidden text-zinc-600 sm:inline">Size:</span>
          {(["dense", "comfy"] as const).map((d) => {
            const active = d === density;
            return (
              <button
                key={d}
                type="button"
                onClick={() => activateDensity(d)}
                className={[
                  "rounded-md border px-2 py-1",
                  active
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-zinc-700 text-zinc-400 hover:border-gold/50",
                ].join(" ")}
              >
                {d === "comfy" ? "Comfy" : "Dense"}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <ProgressBar
          watched={watchedInList}
          total={activeList.entries.length}
        />
        <p className="text-xs text-zinc-500">
          <span className="text-gold font-semibold">
            {watchedInList} / {activeList.entries.length}
          </span>{" "}
          {headline}
        </p>
      </div>

      {/* All grids in DOM, only active visible. */}
      {BUILT_IN_ORDER.map((id) => {
        const entries: FilmEntry[] = LISTS[id].entries;
        const visible = id === activeId;
        return (
          <div
            key={id}
            style={{ display: visible ? undefined : "none" }}
            aria-hidden={!visible}
          >
            <PosterGrid
              entries={entries}
              watchedSet={watchedSet}
              density={density}
              listTitle={LISTS[id].title}
              ownerUsername={usernames}
            />
          </div>
        );
      })}

      <PosterPreloader activeListId={activeId} />
    </div>
  );
}

function intersect(sets: Set<string>[]): Set<string> {
  if (sets.length === 0) return new Set();
  const [first, ...rest] = sets;
  const out = new Set<string>();
  for (const s of first) {
    if (rest.every((r) => r.has(s))) out.add(s);
  }
  return out;
}
function union(sets: Set<string>[]): Set<string> {
  const out = new Set<string>();
  for (const s of sets) for (const v of s) out.add(v);
  return out;
}
