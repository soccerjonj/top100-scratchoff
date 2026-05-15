"use client";

import { useEffect, useMemo, useState } from "react";
import { LISTS } from "@/lib/lists";
import type { CustomListRecord, FilmEntry, ListId } from "@/types";
import { PosterGrid, type Density } from "./PosterGrid";
import { ProgressBar } from "./ProgressBar";
import { PosterPreloader } from "./PosterPreloader";
import { AddCustomListButton } from "./AddCustomListButton";

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

interface ListView {
  id: string;
  title: string;
  shortTitle: string;
  entries: FilmEntry[];
  sourceUrl?: string;
  sourceLabel?: string;
  isCustom: boolean;
}

export function ListSwitcher({
  initialList,
  initialDensity,
  watchedSlugs,
  ownerUsername,
  customLists = [],
}: {
  initialList: string;
  initialDensity: Density;
  watchedSlugs: string[];
  ownerUsername?: string;
  customLists?: CustomListRecord[];
}) {
  const [activeId, setActiveId] = useState<string>(initialList);
  const [density, setDensity] = useState<Density>(initialDensity);
  const watchedSet = useMemo(() => new Set(watchedSlugs), [watchedSlugs]);

  // Build the unified list-of-lists. Built-ins first, then user's custom
  // lists in the order they were added.
  const lists = useMemo<ListView[]>(() => {
    const out: ListView[] = BUILT_IN_ORDER.map((id) => ({
      id,
      title: LISTS[id].title,
      shortTitle: SHORT_TITLE[id],
      entries: LISTS[id].entries,
      sourceUrl: LISTS[id].sourceUrl,
      sourceLabel: LISTS[id].sourceLabel,
      isCustom: false,
    }));
    for (const c of customLists) {
      out.push({
        id: c.id,
        title: c.title,
        shortTitle: c.title.length > 22 ? c.title.slice(0, 22) + "…" : c.title,
        entries: c.entries,
        sourceUrl: c.url,
        sourceLabel: "View on Letterboxd",
        isCustom: true,
      });
    }
    return out;
  }, [customLists]);

  const validIds = useMemo(() => new Set(lists.map((l) => l.id)), [lists]);

  // Sync state from URL on back/forward.
  useEffect(() => {
    function syncFromUrl() {
      const url = new URL(window.location.href);
      const list = url.searchParams.get("list");
      const d = url.searchParams.get("density") as Density | null;
      if (list && validIds.has(list)) setActiveId(list);
      if (d === "comfy" || d === "dense") setDensity(d);
    }
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [validIds]);

  function updateUrl(next: { list?: string; density?: Density }) {
    const url = new URL(window.location.href);
    if (next.list) url.searchParams.set("list", next.list);
    if (next.density) {
      if (next.density === "dense") url.searchParams.delete("density");
      else url.searchParams.set("density", next.density);
    }
    window.history.replaceState({}, "", url.toString());
  }

  function activateList(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    updateUrl({ list: id });
  }

  function activateDensity(d: Density) {
    if (d === density) return;
    setDensity(d);
    updateUrl({ density: d });
  }

  const activeList = lists.find((l) => l.id === activeId) ?? lists[0];
  const watchedInList = activeList.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;

  async function removeCustomList(id: string) {
    if (!ownerUsername) return;
    if (!confirm("Remove this list from your profile?")) return;
    try {
      const res = await fetch("/api/custom-list/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ownerUsername, id }),
      });
      if (res.ok) {
        // Hard reload so the server re-fetches custom lists.
        window.location.assign(`/u/${ownerUsername}`);
      }
    } catch {
      // Best-effort
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <nav className="-mx-3 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-3 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {lists.map((l) => {
          const isActive = l.id === activeId;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => activateList(l.id)}
              className={[
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition sm:px-4 sm:text-sm",
                isActive
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-zinc-700 text-zinc-400 hover:border-gold/50 hover:text-gold/80",
              ].join(" ")}
            >
              <span className="sm:hidden">{l.shortTitle}</span>
              <span className="hidden sm:inline">{l.title}</span>
            </button>
          );
        })}
        {ownerUsername && (
          <AddCustomListButton username={ownerUsername} />
        )}
      </nav>

      {/* Action row: prominent list-level actions on the left
          (source link + remove), density toggle on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeList.sourceUrl && (
            <a
              href={activeList.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-gold hover:text-gold sm:text-sm"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {activeList.sourceLabel ?? "View on Letterboxd"}
            </a>
          )}
          {activeList.isCustom && ownerUsername && (
            <button
              type="button"
              onClick={() => removeCustomList(activeList.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 sm:text-sm"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Remove list
            </button>
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

      {/* Progress bar gets its own row so the list-level actions can
          breathe above it. */}
      <ProgressBar
        watched={watchedInList}
        total={activeList.entries.length}
      />

      {/* All grids rendered, only the active one visible. */}
      {lists.map((l) => {
        const visible = l.id === activeId;
        return (
          <div
            key={l.id}
            style={{ display: visible ? undefined : "none" }}
            aria-hidden={!visible}
          >
            <PosterGrid
              entries={l.entries}
              watchedSet={watchedSet}
              density={density}
              listTitle={l.title}
              ownerUsername={ownerUsername}
            />
          </div>
        );
      })}

      <PosterPreloader
        activeListId={
          BUILT_IN_ORDER.includes(activeId as ListId)
            ? (activeId as ListId)
            : "imdb-top-100"
        }
      />
    </div>
  );
}
