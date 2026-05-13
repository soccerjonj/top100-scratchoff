import { parse, type HTMLElement } from "node-html-parser";

// Letterboxd 403s atypical UAs; use a real browser UA.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export class LetterboxdNotFoundError extends Error {}

export interface ScrapeResult {
  slugs: string[];
}

function extractSlugsFromHtml(html: string): string[] {
  const root = parse(html);
  const slugs: string[] = [];
  const nodes = root.querySelectorAll("[data-target-link]") as HTMLElement[];
  for (const node of nodes) {
    const link = node.getAttribute("data-target-link");
    if (!link) continue;
    const m = link.match(/^\/film\/([^/]+)\/?$/);
    if (m) slugs.push(m[1]);
  }
  return slugs;
}

/**
 * Scrape the *first* page of a user's /films/ grid (~72 most-recent watches).
 *
 * Letterboxd actively blocks server-side pagination on user film pages — page
 * 2+ returns 403 regardless of headers. Full history therefore requires the
 * user's `watched.csv` export, handled separately. This function is used for
 * incremental "what's new since last time" updates.
 */
export async function scrapeRecentFilms(
  username: string,
): Promise<ScrapeResult> {
  const cleanName = username.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_-]+$/.test(cleanName)) {
    throw new Error("Invalid Letterboxd username");
  }

  const res = await fetch(`https://letterboxd.com/${cleanName}/films/`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    cache: "no-store",
  });
  if (res.status === 404) throw new LetterboxdNotFoundError(cleanName);
  if (!res.ok) {
    throw new Error(`Letterboxd returned ${res.status} for /${cleanName}/films/`);
  }

  const slugs = extractSlugsFromHtml(await res.text());
  return { slugs };
}

/**
 * Confirm a Letterboxd user exists. Just hits the profile page.
 */
export async function letterboxdUserExists(username: string): Promise<boolean> {
  const cleanName = username.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_-]+$/.test(cleanName)) return false;
  const res = await fetch(`https://letterboxd.com/${cleanName}/`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    cache: "no-store",
  });
  return res.ok;
}
