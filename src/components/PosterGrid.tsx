import type { FilmEntry } from "@/types";
import { PosterCard } from "./PosterCard";

export function PosterGrid({
  entries,
  watchedSet,
}: {
  entries: FilmEntry[];
  watchedSet: Set<string>;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {entries.map((entry) => (
        <PosterCard
          key={`${entry.rank}-${entry.letterboxdSlug}`}
          entry={entry}
          watched={watchedSet.has(entry.letterboxdSlug)}
        />
      ))}
    </div>
  );
}
