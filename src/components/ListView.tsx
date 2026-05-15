import { LISTS } from "@/lib/lists";
import type { ListId } from "@/types";
import { ListTabs } from "./ListTabs";
import { ProgressBar } from "./ProgressBar";
import { PosterGrid, type Density } from "./PosterGrid";
import { DensityToggle } from "./DensityToggle";

export function ListView({
  activeList,
  watchedSlugs,
  username,
  basePath,
  density = "dense",
  extraParams = {},
  ownerUsername,
}: {
  activeList: ListId;
  watchedSlugs: string[];
  username: string;
  basePath?: string;
  density?: Density;
  /** Extra search params to preserve on tab/toggle links (e.g. mode= on /together). */
  extraParams?: Record<string, string>;
  /**
   * Owner of the manual-watch toggle. Pass a single username on solo
   * views, or an array on /together so the toggle fans out to every
   * user in the pair.
   */
  ownerUsername?: string | string[];
}) {
  const list = LISTS[activeList];
  const watchedSet = new Set(watchedSlugs);
  const watchedInList = list.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;
  const tabsBase = basePath ?? `/u/${username}`;

  return (
    <div className="flex flex-col gap-5">
      <ListTabs active={activeList} basePath={tabsBase} extraParams={{ ...extraParams, ...(density === "comfy" ? { density } : {}) }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <ProgressBar watched={watchedInList} total={list.entries.length} />
        </div>
        <div className="flex items-center gap-3">
          {list.sourceUrl && (
            <a
              href={list.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-500 underline-offset-2 hover:text-gold hover:underline"
            >
              {list.sourceLabel ?? "View on Letterboxd"} ↗
            </a>
          )}
          <DensityToggle
            density={density}
            basePath={tabsBase}
            activeList={activeList}
            extraParams={extraParams}
          />
        </div>
      </div>
      <PosterGrid
        entries={list.entries}
        watchedSet={watchedSet}
        density={density}
        listTitle={list.title}
        ownerUsername={ownerUsername}
      />
    </div>
  );
}
