/**
 * Scrape an arbitrary public Letterboxd list (e.g.
 * https://letterboxd.com/dave/list/best-of-1999/) into a FilmEntry[]
 * shape compatible with the built-in lists.
 *
 * Two-stage:
 *  1. Walk paginated list pages and collect data-target-link film slugs.
 *  2. For each slug, fetch /film/{slug}/ to extract its TMDB id, then
 *     TMDB itself for title/year/poster_path. Concurrency-limited to
 *     avoid hammering either upstream.
 *
 * Mirrors the build-lists.ts pipeline but runs at request time, lives
 * in the deployed app (no Node-script dependencies), and uses the
 * TMDB_API_KEY env var.
 */

import { parse, type HTMLElement } from "node-html-parser";
import type { FilmEntry } from "@/types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export class InvalidLetterboxdListUrl extends Error {}
export class LetterboxdListNotFound extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Letterboxd returned ${res.status} for ${url}`);
  }
  return res.text();
}

interface ParsedUrl {
  username: string;
  listSlug: string;
  canonical: string;
}

/**
 * Accepts forms like:
 *   https://letterboxd.com/dave/list/best-of-1999/
 *   letterboxd.com/dave/list/best-of-1999
 *   http://letterboxd.com/dave/list/best-of-1999/page/2/
 * Returns canonical URL (no trailing slash, no /page/N).
 */
export function parseLetterboxdListUrl(input: string): ParsedUrl {
  const trimmed = input.trim();
  // Add protocol if missing
  const withProto = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    throw new InvalidLetterboxdListUrl("Not a valid URL");
  }
  if (parsed.hostname !== "letterboxd.com" && parsed.hostname !== "www.letterboxd.com") {
    throw new InvalidLetterboxdListUrl("Must be a letterboxd.com URL");
  }
  // Match /{user}/list/{slug}/ optionally with /page/N/, /detail/, etc.
  const m = parsed.pathname.match(/^\/([a-z0-9_-]+)\/list\/([a-z0-9-]+)\/?/i);
  if (!m) {
    throw new InvalidLetterboxdListUrl(
      "URL must look like letterboxd.com/<user>/list/<list-slug>/",
    );
  }
  const username = m[1].toLowerCase();
  const listSlug = m[2].toLowerCase();
  const canonical = `https://letterboxd.com/${username}/list/${listSlug}`;
  return { username, listSlug, canonical };
}

async function scrapeListSlugsAndTitle(canonical: string): Promise<{
  title: string;
  slugs: string[];
}> {
  let title = "";
  const all: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? `${canonical}/` : `${canonical}/page/${page}/`;
    const html = await fetchHtml(url);
    if (!html) {
      if (page === 1) throw new LetterboxdListNotFound(canonical);
      break;
    }
    const root = parse(html);
    if (page === 1) {
      // List title lives in <meta property="og:title"> (clean string,
      // free of trailing " — Letterboxd" decoration).
      const og = root.querySelector('meta[property="og:title"]');
      title = og?.getAttribute("content")?.trim() ?? "";
      // Fallback to <h1> if og missing
      if (!title) {
        const h1 = root.querySelector("h1");
        title = h1?.text.trim() ?? "Untitled list";
      }
    }
    const nodes = root.querySelectorAll("[data-target-link]") as HTMLElement[];
    const pageSlugs: string[] = [];
    for (const n of nodes) {
      const link = n.getAttribute("data-target-link") ?? "";
      const m = link.match(/^\/film\/([^/]+)\/?$/);
      if (m) pageSlugs.push(m[1]);
    }
    if (pageSlugs.length === 0) break;
    all.push(...pageSlugs);
    if (pageSlugs.length < 100) break;
    await sleep(400);
  }
  return { title, slugs: Array.from(new Set(all)) };
}

async function tmdbIdForFilm(slug: string): Promise<number | null> {
  const html = await fetchHtml(`https://letterboxd.com/film/${slug}/`);
  if (!html) return null;
  const m = html.match(/themoviedb\.org\/movie\/(\d+)/);
  return m ? Number(m[1]) : null;
}

interface TmdbMeta {
  title: string;
  year: number;
  posterPath: string | null;
}

async function tmdbById(id: number, key: string): Promise<TmdbMeta | null> {
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
  url.searchParams.set("api_key", key);
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = (await res.json()) as {
    title: string;
    release_date?: string;
    poster_path: string | null;
  };
  return {
    title: j.title,
    year: Number(j.release_date?.slice(0, 4) || 0),
    posterPath: j.poster_path,
  };
}

async function inParallel<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface ScrapedList {
  url: string;
  title: string;
  entries: FilmEntry[];
}

/**
 * Scrape + enrich a Letterboxd list. Throws InvalidLetterboxdListUrl
 * or LetterboxdListNotFound for the obvious cases.
 *
 * `maxEntries` caps the work so we don't blow the function timeout on
 * absurdly large lists (e.g. someone's "every film I've watched"
 * 4000-entry list).
 */
export async function scrapeLetterboxdList(
  inputUrl: string,
  opts: { maxEntries?: number; concurrency?: number } = {},
): Promise<ScrapedList> {
  const maxEntries = opts.maxEntries ?? 250;
  const concurrency = opts.concurrency ?? 6;

  const TMDB_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_KEY) throw new Error("TMDB_API_KEY not configured");

  const { canonical } = parseLetterboxdListUrl(inputUrl);
  const { title, slugs } = await scrapeListSlugsAndTitle(canonical);
  if (slugs.length === 0) throw new LetterboxdListNotFound(canonical);

  const truncated = slugs.slice(0, maxEntries);

  const entries: FilmEntry[] = await inParallel(
    truncated,
    async (slug, i): Promise<FilmEntry> => {
      const tmdbId = await tmdbIdForFilm(slug);
      let meta: TmdbMeta | null = null;
      if (tmdbId) {
        meta = await tmdbById(tmdbId, TMDB_KEY);
      }
      return {
        rank: i + 1,
        title: meta?.title ?? slug.replace(/-/g, " "),
        year: meta?.year ?? 0,
        tmdbId,
        posterPath: meta?.posterPath ?? null,
        letterboxdSlug: slug,
      };
    },
    concurrency,
  );

  return { url: canonical, title: title || "Untitled list", entries };
}
