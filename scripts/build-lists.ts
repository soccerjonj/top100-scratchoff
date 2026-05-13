/**
 * One-off enrichment script.
 *
 * Two pipelines:
 *
 * IMDB Top 100 (or any list authored from titles):
 *   Read scripts/raw/imdb-top-100.txt (one "Title (Year)" per line, in rank
 *   order). For each: TMDB search → canonical Letterboxd slug via the
 *   letterboxd.com/tmdb/{id}/ redirect → poster path from TMDB. Write
 *   src/data/imdb-top-100.json.
 *
 * Letterboxd Top 500 (slug-first):
 *   Scrape https://letterboxd.com/official/list/letterboxds-top-500-films/
 *   pages 1..N. Each tile exposes data-target-link="/film/{slug}/". For each
 *   slug, fetch /film/{slug}/ to extract title, year, and TMDB id, then
 *   TMDB by id for poster_path. Write src/data/letterboxd-top-500.json.
 *
 * Run with:
 *   TMDB_API_KEY=... npm run build-lists                 # IMDB only
 *   TMDB_API_KEY=... npm run build-lists -- --letterboxd # Letterboxd only
 *   TMDB_API_KEY=... npm run build-lists -- --all        # both
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { parse, type HTMLElement } from "node-html-parser";
import type { FilmEntry } from "../src/types";

const TMDB_KEY = process.env.TMDB_API_KEY;
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "scripts/raw");
const DATA_DIR = path.join(ROOT, "src/data");

const UA_BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA_BROWSER, Accept: "text/html" } });
  if (!res.ok) {
    console.warn(`[fetch] ${url} → ${res.status}`);
    return null;
  }
  return res.text();
}

// ---------- IMDB Top 100 (title-first) ----------

interface RawTitle {
  rank: number;
  title: string;
  year: number;
}

function parseRaw(text: string): RawTitle[] {
  const out: RawTitle[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    const m = line.match(/^(.+?)\s*\((\d{4})\)\s*$/);
    if (!m) {
      console.warn(`[skip] line ${i + 1}: "${line}" — expected "Title (YYYY)"`);
      return;
    }
    out.push({ rank: i + 1, title: m[1], year: Number(m[2]) });
  });
  return out;
}

async function tmdbSearch(
  title: string,
  year: number,
): Promise<{ id: number; posterPath: string | null } | null> {
  if (!TMDB_KEY) throw new Error("TMDB_API_KEY required");
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("query", title);
  url.searchParams.set("year", String(year));
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[tmdb] ${title} (${year}) → ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { results: Array<{ id: number; poster_path: string | null }> };
  const hit = json.results[0];
  return hit ? { id: hit.id, posterPath: hit.poster_path } : null;
}

async function tmdbById(id: number): Promise<{ title: string; year: number; posterPath: string | null } | null> {
  if (!TMDB_KEY) throw new Error("TMDB_API_KEY required");
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
  url.searchParams.set("api_key", TMDB_KEY);
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { title: string; release_date: string; poster_path: string | null };
  const year = Number(json.release_date?.slice(0, 4) || 0);
  return { title: json.title, year, posterPath: json.poster_path };
}

async function letterboxdSlugForTmdb(tmdbId: number): Promise<string | null> {
  const res = await fetch(`https://letterboxd.com/tmdb/${tmdbId}/`, {
    redirect: "follow",
    headers: { "User-Agent": UA_BROWSER },
  });
  if (!res.ok) return null;
  const m = res.url.match(/\/film\/([^/]+)\/?/);
  return m ? m[1] : null;
}

async function buildImdb(): Promise<void> {
  const rawPath = path.join(RAW_DIR, "imdb-top-100.txt");
  let rawText: string;
  try {
    rawText = await fs.readFile(rawPath, "utf8");
  } catch {
    console.warn(`[imdb] no raw file at ${rawPath}, skipping`);
    return;
  }
  const raw = parseRaw(rawText);
  const out: FilmEntry[] = [];
  for (const r of raw) {
    const hit = await tmdbSearch(r.title, r.year);
    let slug = "";
    if (hit) {
      slug = (await letterboxdSlugForTmdb(hit.id)) ?? "";
      await sleep(150);
    }
    out.push({
      rank: r.rank,
      title: r.title,
      year: r.year,
      tmdbId: hit?.id ?? null,
      posterPath: hit?.posterPath ?? null,
      letterboxdSlug: slug,
    });
    console.log(
      `#${r.rank.toString().padStart(3)}  ${r.title} (${r.year}) → tmdb:${hit?.id ?? "MISS"} slug:${slug || "MISS"}`,
    );
    await sleep(150);
  }
  const file = path.join(DATA_DIR, "imdb-top-100.json");
  await fs.writeFile(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} entries → ${file}`);
}

// ---------- Letterboxd Top 500 (slug-first) ----------

const LB_LIST_URL =
  "https://letterboxd.com/official/list/letterboxds-top-500-films";

async function scrapeTopListSlugs(): Promise<string[]> {
  const all: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? `${LB_LIST_URL}/` : `${LB_LIST_URL}/page/${page}/`;
    const html = await fetchHtml(url);
    if (!html) break;
    const root = parse(html);
    const nodes = root.querySelectorAll("[data-target-link]") as HTMLElement[];
    const pageSlugs: string[] = [];
    for (const n of nodes) {
      const link = n.getAttribute("data-target-link") ?? "";
      const m = link.match(/^\/film\/([^/]+)\/?$/);
      if (m) pageSlugs.push(m[1]);
    }
    if (pageSlugs.length === 0) break;
    all.push(...pageSlugs);
    console.log(`[lb] page ${page}: +${pageSlugs.length} (total ${all.length})`);
    if (pageSlugs.length < 100) break;
    await sleep(500);
  }
  // De-dupe but preserve order
  return Array.from(new Set(all));
}

async function tmdbIdForFilm(slug: string): Promise<number | null> {
  const html = await fetchHtml(`https://letterboxd.com/film/${slug}/`);
  if (!html) return null;
  const m = html.match(/themoviedb\.org\/movie\/(\d+)/);
  return m ? Number(m[1]) : null;
}

async function buildLetterboxd(): Promise<void> {
  const slugs = await scrapeTopListSlugs();
  if (slugs.length === 0) {
    console.warn("[lb] no slugs collected, aborting");
    return;
  }
  const out: FilmEntry[] = [];
  let rank = 0;
  for (const slug of slugs) {
    rank++;
    const tmdbId = await tmdbIdForFilm(slug);
    await sleep(200);
    let title = slug.replace(/-/g, " ");
    let year = 0;
    let posterPath: string | null = null;
    if (tmdbId) {
      const meta = await tmdbById(tmdbId);
      if (meta) {
        title = meta.title;
        year = meta.year;
        posterPath = meta.posterPath;
      }
      await sleep(150);
    }
    out.push({ rank, title, year, tmdbId, posterPath, letterboxdSlug: slug });
    console.log(
      `#${rank.toString().padStart(3)}  ${slug} → tmdb:${tmdbId ?? "MISS"}  ${title} (${year || "?"})`,
    );
  }
  const file = path.join(DATA_DIR, "letterboxd-top-500.json");
  await fs.writeFile(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} entries → ${file}`);
}

// ---------- entrypoint ----------

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const wantLb = args.includes("--letterboxd") || args.includes("--all");
  const wantImdb = args.includes("--imdb") || args.includes("--all") || (!wantLb && args.length === 0);

  if (wantImdb) await buildImdb();
  if (wantLb) await buildLetterboxd();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
