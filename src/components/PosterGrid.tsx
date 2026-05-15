import type { FilmEntry } from "@/types";
import { PosterCard } from "./PosterCard";

export type Density = "dense" | "comfy";

// Inline-style `minmax()` can't use media queries, so the per-breakpoint
// values live in globals.css. We just set the right class here.
const CLASS_BY_DENSITY: Record<Density, string> = {
  dense: "poster-grid-dense",
  comfy: "poster-grid-comfy",
};

export function PosterGrid({
  entries,
  watchedSet,
  density = "dense",
  listTitle,
  ownerUsername,
}: {
  entries: FilmEntry[];
  watchedSet: Set<string>;
  density?: Density;
  /** Shown in the per-movie dialog as "#N in {listTitle}". */
  listTitle?: string;
  /** Single-user views pass this so the dialog can show a manual-watch toggle. */
  ownerUsername?: string | string[];
}) {
  return (
    <div className={`grid gap-1.5 sm:gap-2 ${CLASS_BY_DENSITY[density]}`}>
      {entries.map((entry) => (
        <PosterCard
          key={`${entry.rank}-${entry.letterboxdSlug}`}
          entry={entry}
          watched={watchedSet.has(entry.letterboxdSlug)}
          listTitle={listTitle}
          ownerUsername={ownerUsername}
        />
      ))}
    </div>
  );
}
