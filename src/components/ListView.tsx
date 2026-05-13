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
}: {
  activeList: ListId;
  watchedSlugs: string[];
  username: string;
  basePath?: string;
  density?: Density;
  /** Extra search params to preserve on tab/toggle links (e.g. mode= on /together). */
  extraParams?: Record<string, string>;
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
        <DensityToggle
          density={density}
          basePath={tabsBase}
          activeList={activeList}
          extraParams={extraParams}
        />
      </div>
      <PosterGrid
        entries={list.entries}
        watchedSet={watchedSet}
        density={density}
      />
    </div>
  );
}
