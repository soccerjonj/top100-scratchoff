import imdbTop100 from "@/data/imdb-top-100.json";
import letterboxdTop500 from "@/data/letterboxd-top-500.json";
import nytTop100 from "@/data/nyt-top-100.json";
import afiTop100 from "@/data/afi-top-100.json";
import type { FilmEntry, ListId } from "@/types";

interface ListMeta {
  title: string;
  entries: FilmEntry[];
  /** Canonical Letterboxd list URL the list was sourced from. */
  sourceUrl?: string;
  /** "View source list" link text — defaults to "View on Letterboxd". */
  sourceLabel?: string;
}

export const LISTS: Record<ListId, ListMeta> = {
  "imdb-top-100": {
    title: "IMDB Top 100 Fan Favorites",
    entries: imdbTop100 as FilmEntry[],
    // IMDB's fan-favorite chart, the original source for the scratch-off poster.
    sourceUrl: "https://www.imdb.com/chart/top/",
    sourceLabel: "View on IMDB",
  },
  "afi-top-100": {
    title: "AFI 100 Years…100 Movies",
    entries: afiTop100 as FilmEntry[],
    sourceUrl:
      "https://letterboxd.com/afi/list/afis-100-years100-movies-10th-anniversary/",
  },
  "nyt-top-100": {
    title: "NYT 100 Best of the 21st Century",
    entries: nytTop100 as FilmEntry[],
    sourceUrl:
      "https://letterboxd.com/kastranec/list/nyt-100-best-movie-of-the-21st-century/",
  },
  "letterboxd-top-500": {
    title: "Letterboxd's Top 500",
    entries: letterboxdTop500 as FilmEntry[],
    sourceUrl:
      "https://letterboxd.com/official/list/letterboxds-top-500-films/",
  },
};

export function getList(id: ListId) {
  return LISTS[id];
}
