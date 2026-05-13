import { LISTS } from "@/lib/lists";
import type { ListId } from "@/types";
import { ListTabs } from "./ListTabs";
import { ProgressBar } from "./ProgressBar";
import { PosterGrid } from "./PosterGrid";

export function ListView({
  activeList,
  watchedSlugs,
  username,
  basePath,
}: {
  activeList: ListId;
  watchedSlugs: string[];
  /** Username (or "userA/userB" for /together/). Only used as a fallback key. */
  username: string;
  /** Base URL for list-tab links. Defaults to /u/{username}. */
  basePath?: string;
}) {
  const list = LISTS[activeList];
  const watchedSet = new Set(watchedSlugs);
  const watchedInList = list.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;
  const tabsBase = basePath ?? `/u/${username}`;

  return (
    <div className="flex flex-col gap-5">
      <ListTabs active={activeList} basePath={tabsBase} />
      <ProgressBar watched={watchedInList} total={list.entries.length} />
      <PosterGrid entries={list.entries} watchedSet={watchedSet} />
    </div>
  );
}
