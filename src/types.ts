export type ListId =
  | "imdb-top-100"
  | "letterboxd-top-500"
  | "nyt-top-100"
  | "afi-top-100";

export interface FilmEntry {
  rank: number;
  title: string;
  year: number;
  tmdbId: number | null;
  posterPath: string | null;
  letterboxdSlug: string;
}

export interface UserRecord {
  username: string;
  /** Union of CSV-imported slugs and slugs from incremental scrapes. */
  watchedSlugs: string[];
  /** Total slugs (== watchedSlugs.length, denormalised for UI). */
  filmCount: number;
  /** When the user last uploaded a CSV (= last full backfill). */
  csvUploadedAt: Date | null;
  /** When we last scraped page 1 of their /films/ grid. */
  lastScrapedAt: Date;
  createdAt: Date;
  /**
   * Slugs the user explicitly marked watched via the in-app toggle.
   * Preserved across CSV/scrape merges; unioned with `watchedSlugs` to
   * produce the effective watched set. Lets users track films that
   * aren't in their Letterboxd profile (or who don't use Letterboxd).
   */
  manualWatched?: string[];
  /**
   * Slugs the user explicitly marked NOT watched via the in-app toggle.
   * Overrides anything in `watchedSlugs` so a user can correct a stray
   * Letterboxd entry without re-importing.
   */
  manualUnwatched?: string[];
}

/** Compute the effective watched slug set, applying manual overrides. */
export function effectiveWatchedSet(user: {
  watchedSlugs: string[];
  manualWatched?: string[];
  manualUnwatched?: string[];
}): Set<string> {
  const set = new Set(user.watchedSlugs);
  for (const s of user.manualWatched ?? []) set.add(s);
  for (const s of user.manualUnwatched ?? []) set.delete(s);
  return set;
}
