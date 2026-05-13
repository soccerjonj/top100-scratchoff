import imdbTop100 from "@/data/imdb-top-100.json";
import letterboxdTop500 from "@/data/letterboxd-top-500.json";
import nytTop100 from "@/data/nyt-top-100.json";
import type { FilmEntry, ListId } from "@/types";

export const LISTS: Record<ListId, { title: string; entries: FilmEntry[] }> = {
  "imdb-top-100": {
    title: "IMDB Top 100 Fan Favorites",
    entries: imdbTop100 as FilmEntry[],
  },
  "letterboxd-top-500": {
    title: "Letterboxd's Top 500",
    entries: letterboxdTop500 as FilmEntry[],
  },
  "nyt-top-100": {
    title: "NYT 100 Best of the 21st Century",
    entries: nytTop100 as FilmEntry[],
  },
};

export function getList(id: ListId) {
  return LISTS[id];
}
