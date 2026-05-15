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
  /**
   * Marks a record created for someone without a Letterboxd account.
   * Skip all scrape attempts for guest users — they exist purely so
   * the manual-watch toggle works.
   */
  isGuest?: boolean;
  /**
   * IDs of custom Letterboxd lists this user has attached to their
   * profile. The actual list data (title, entries) lives in a shared
   * customLists collection, keyed by id, so the same list across
   * multiple users is scraped/stored once.
   */
  customListIds?: string[];
}

export interface CustomListRecord {
  /** Stable id: hash of the canonical Letterboxd URL. */
  id: string;
  /** Canonical Letterboxd URL (no trailing slash). */
  url: string;
  /** Display title from the list page. */
  title: string;
  /** Same shape as built-in lists. */
  entries: FilmEntry[];
  /** When we last scraped this list. */
  scrapedAt: Date;
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
