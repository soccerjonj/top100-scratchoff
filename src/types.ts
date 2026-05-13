export type ListId =
  | "imdb-top-100"
  | "letterboxd-top-500"
  | "nyt-top-100";

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
}
