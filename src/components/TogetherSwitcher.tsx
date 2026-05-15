"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

type Mode = "both" | "either";

interface ListView {
  id: string;
  title: string;
  shortTitle: string;
  entries: FilmEntry[];
  sourceUrl?: string;
  sourceLabel?: string;
  isCustom: boolean;
}

/**
 * Tab/mode/density switching for /together, all client-side. Same
 * principle as ListSwitcher (every grid rendered upfront, only one
 * visible) plus:
 *  - "Both / Either" mode toggle computes intersection or union of
 *    the users' watched sets client-side — instant
 *  - Active list/mode/density stay in sync with the URL via
 *    history.replaceState
 *  - Custom lists are the union of every participant's pinned lists.
 *    Adding a new list writes it to the FIRST username's record (the
 *    "host"); appears for the whole group via union on next nav.
 */
export function TogetherSwitcher({
  usernames,
  userWatched,
  initialList,
  initialMode,
  initialDensity,
  customLists = [],
}: {
  usernames: string[];
  /** Each user's effective watched slug set, same order as usernames. */
  userWatched: string[][];
  initialList: string;
  initialMode: Mode;
  initialDensity: Density;
  /** Union of all participants' custom lists. */
  customLists?: CustomListRecord[];
}) {
  const [activeId, setActiveId] = useState<string>(initialList);
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

  // Unified list-of-lists: built-ins first, then custom lists.
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

  useEffect(() => {
    function sync() {
      const url = new URL(window.location.href);
      const l = url.searchParams.get("list");
      const m = url.searchParams.get("mode");
      const d = url.searchParams.get("density") as Density | null;
      if (l && validIds.has(l)) setActiveId(l);
      if (m === "both" || m === "either") setMode(m);
      if (d === "comfy" || d === "dense") setDensity(d);
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [validIds]);

  function updateUrl(next: { list?: string; mode?: Mode; density?: Density }) {
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

  function activateList(id: string) {
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

  const activeList = lists.find((l) => l.id === activeId) ?? lists[0];
  const watchedInList = activeList.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;
  const headline = mode === "both" ? "both watched" : "either watched";

  // Adding a custom list in /together writes to the FIRST username's
  // record (the "host"). Other participants will see it on next page
  // load via the customListIds union in the server component.
  const host = usernames[0];

  async function removeCustomList(id: string) {
    if (!confirm("Remove this list from the host's profile?")) return;
    try {
      const res = await fetch("/api/custom-list/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: host, id }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // Best-effort
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* List tabs */}
      <nav className="-mx-3 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-3 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {lists.map((l) => {
          const isActive = l.id === activeId;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => activateList(l.id)}
              className={[
                "relative shrink-0 rounded-full border px-3 py-1.5 text-xs transition sm:px-4 sm:text-sm",
                isActive
                  ? "border-transparent text-gold"
                  : "border-zinc-700 text-zinc-400 hover:border-gold/50 hover:text-gold/80",
              ].join(" ")}
            >
              {isActive && (
                <motion.span
                  layoutId="active-together-list-tab"
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-gold bg-gold/10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                    mass: 0.6,
                  }}
                />
              )}
              <span className="relative z-10 sm:hidden">{l.shortTitle}</span>
              <span className="relative z-10 hidden sm:inline">{l.title}</span>
            </button>
          );
        })}
        <AddCustomListButton username={host} />
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
                "relative rounded-full border px-3 py-1 text-xs transition",
                active
                  ? "border-transparent text-gold"
                  : "border-zinc-700 text-zinc-400 hover:border-gold/50",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId="active-together-mode"
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-gold bg-gold/10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                    mass: 0.6,
                  }}
                />
              )}
              <span className="relative z-10">
                {m === "both" ? "Both watched" : "Either watched"}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Source link + remove (for custom lists) + density */}
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
          {activeList.isCustom && (
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
                  "relative rounded-md border px-2 py-1",
                  active
                    ? "border-transparent text-gold"
                    : "border-zinc-700 text-zinc-400 hover:border-gold/50",
                ].join(" ")}
              >
                {active && (
                  <motion.span
                    layoutId="active-together-density"
                    aria-hidden
                    className="absolute inset-0 rounded-md border border-gold bg-gold/10"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                      mass: 0.6,
                    }}
                  />
                )}
                <span className="relative z-10">
                  {d === "comfy" ? "Comfy" : "Dense"}
                </span>
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

      {/* Grid area with a subtle gold flash overlay on tab change. */}
      <div className="relative">
        <div
          key={`flash-${activeId}-${mode}`}
          className="tab-switch-flash absolute inset-x-0 top-0 z-10 h-32"
          aria-hidden
        />
        {/* All grids in DOM, only active visible. */}
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
                ownerUsername={usernames}
              />
            </div>
          );
        })}
      </div>

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
