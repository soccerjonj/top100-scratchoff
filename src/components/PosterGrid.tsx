import type { FilmEntry } from "@/types";
import { PosterCard } from "./PosterCard";

export type Density = "dense" | "comfy";

const MIN_BY_DENSITY: Record<Density, string> = {
  dense: "minmax(70px, 1fr)",
  comfy: "minmax(130px, 1fr)",
};

export function PosterGrid({
  entries,
  watchedSet,
  density = "comfy",
}: {
  entries: FilmEntry[];
  watchedSet: Set<string>;
  density?: Density;
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(auto-fill, ${MIN_BY_DENSITY[density]})`,
      }}
    >
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
