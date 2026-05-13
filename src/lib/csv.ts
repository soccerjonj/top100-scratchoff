/**
 * Parser for Letterboxd's watched.csv export.
 *
 * Header looks like:  Date,Name,Year,Letterboxd URI
 * Row looks like:     2024-05-10,The Godfather,1972,https://boxd.it/29hh
 *
 * The "Letterboxd URI" column ships as short `boxd.it/XXXX` URLs that 302
 * to canonical /film/{slug}/ pages — but Letterboxd rate-limits those
 * redirects very aggressively (618 of 732 → HTTP 429 in testing). So we
 * don't resolve them. Instead we match each row's Name + Year against the
 * canonical titles in our hardcoded lists and pull the slug from there.
 *
 * Trade-off: we only record slugs for films that appear in our lists, but
 * those are the only ones that affect the grid display anyway. Total films
 * watched is taken from the CSV row count.
 */

import type { FilmEntry } from "@/types";

export interface ParsedCsv {
  matchedSlugs: string[];
  totalRows: number;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else if (c === '"' && cur === "") {
      inQuotes = true;
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

/**
 * Lowercase, decompose diacritics, drop everything that isn't ASCII
 * letters/digits. "WALL·E" → "walle", "Schindler's List" → "schindlerslist".
 */
function normalizeTitle(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function key(title: string, year: number): string {
  return `${normalizeTitle(title)}|${year}`;
}

/**
 * Build a lookup `normalized title + year → letterboxd slug` from all our
 * list entries. Used to translate CSV rows into matched slugs.
 */
export function buildListLookup(entries: FilmEntry[][]): Map<string, string> {
  const map = new Map<string, string>();
  for (const list of entries) {
    for (const e of list) {
      if (!e.letterboxdSlug) continue;
      map.set(key(e.title, e.year), e.letterboxdSlug);
    }
  }
  return map;
}

export function parseWatchedCsv(
  text: string,
  listLookup: Map<string, string>,
): ParsedCsv {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  if (lines.length === 0) return { matchedSlugs: [], totalRows: 0 };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const nameIdx = header.findIndex((h) => h === "name");
  const yearIdx = header.findIndex((h) => h === "year");
  if (nameIdx < 0 || yearIdx < 0) {
    throw new Error(
      'CSV missing "Name" or "Year" column — is this a Letterboxd export?',
    );
  }

  const matched = new Set<string>();
  let totalRows = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const name = cells[nameIdx];
    const year = Number(cells[yearIdx]);
    if (!name || !year) continue;
    totalRows++;
    const slug = listLookup.get(key(name, year));
    if (slug) matched.add(slug);
  }

  return { matchedSlugs: Array.from(matched).sort(), totalRows };
}
