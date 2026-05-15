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
    // The IMDb-curated Top 100 mirrored from the Curious Charts ×
    // IMDb scratch-off poster (curiouscharts.com/products/official-
    // imdb-top-100-movies-scratch-off-poster…). The closest IMDb-
    // hosted mirror is the "Top 100 Poster" user list maintained at
    // ls082915895 — same 100 films, in rank order.
    sourceUrl: "https://www.imdb.com/list/ls082915895/",
    sourceLabel: "View on IMDb",
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
