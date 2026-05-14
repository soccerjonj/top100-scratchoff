"use client";

import { useEffect, useMemo, useState } from "react";
import { LISTS } from "@/lib/lists";
import type { FilmEntry, ListId } from "@/types";
import { PosterGrid, type Density } from "./PosterGrid";
import { ProgressBar } from "./ProgressBar";
import { PosterPreloader } from "./PosterPreloader";

const ORDER: ListId[] = [
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

/**
 * All 4 grids rendered upfront, only one visible at a time. Tab and
 * density changes are client-side state (no server roundtrip, no
 * remount of any PosterCard), so switching feels instant.
 *
 * URL stays in sync via history.replaceState so deep-links and the
 * per-list share buttons continue to work.
 *
 * Inactive grids are display:none so they don't paint, but they ARE
 * in the DOM. Once their poster images land in the browser cache (via
 * PosterPreloader, which kicks off background fetches 1.5s after mount)
 * the first switch to each tab is also instant.
 */
export function ListSwitcher({
  initialList,
  initialDensity,
  watchedSlugs,
  ownerUsername,
}: {
  initialList: ListId;
  initialDensity: Density;
  watchedSlugs: string[];
  ownerUsername?: string;
}) {
  const [activeId, setActiveId] = useState<ListId>(initialList);
  const [density, setDensity] = useState<Density>(initialDensity);
  const watchedSet = useMemo(() => new Set(watchedSlugs), [watchedSlugs]);

  // Sync state from URL on back/forward.
  useEffect(() => {
    function syncFromUrl() {
      const url = new URL(window.location.href);
      const list = url.searchParams.get("list") as ListId | null;
      const d = url.searchParams.get("density") as Density | null;
      if (list && ORDER.includes(list)) setActiveId(list);
      if (d === "comfy" || d === "dense") setDensity(d);
    }
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function updateUrl(next: { list?: ListId; density?: Density }) {
    const url = new URL(window.location.href);
    if (next.list) url.searchParams.set("list", next.list);
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

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <nav className="-mx-3 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-3 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {ORDER.map((id) => {
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

      {/* Progress + source link + density toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px] flex-1">
          <ProgressBar
            watched={watchedInList}
            total={activeList.entries.length}
          />
        </div>
        <div className="flex items-center gap-3">
          {activeList.sourceUrl && (
            <a
              href={activeList.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-500 underline-offset-2 hover:text-gold hover:underline"
            >
              {activeList.sourceLabel ?? "View on Letterboxd"} ↗
            </a>
          )}
          <nav className="flex items-center gap-1 text-xs">
            <span className="text-zinc-600">Size:</span>
            {(["dense", "comfy"] as const).map((d) => {
              const active = d === density;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => activateDensity(d)}
                  className={[
                    "rounded-md border px-2 py-0.5",
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
      </div>

      {/* All 4 grids rendered, one visible. */}
      {ORDER.map((id) => {
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
              ownerUsername={ownerUsername}
            />
          </div>
        );
      })}

      <PosterPreloader activeListId={activeId} />
    </div>
  );
}
