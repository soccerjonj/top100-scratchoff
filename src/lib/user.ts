import { getUsersCollection } from "@/lib/mongo";
import {
  scrapeRecentFilms,
  letterboxdUserExists,
  LetterboxdNotFoundError,
} from "@/lib/letterboxd";
import type { UserRecord } from "@/types";

// Each /u/[username] visit triggers a scrape if data is older than this.
// Short enough that "another day, another visit" always gets fresh data;
// long enough that tab-switching or revisiting within a session reuses
// the cached scrape and doesn't hammer Letterboxd's rate limits.
const STALE_MS = 30 * 60 * 1000;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export async function getUser(username: string): Promise<UserRecord | null> {
  const col = await getUsersCollection();
  return col.findOne({ username }, { projection: { _id: 0 } });
}

/**
 * Merge a set of newly-discovered slugs into the user's record. Creates the
 * record if missing. Returns the updated record.
 *
 * `source` controls which timestamp gets bumped:
 * - "scrape" → `lastScrapedAt`, slugs get added (union, not replace)
 * - "csv"    → `csvUploadedAt` *and* `lastScrapedAt`; slugs *replace* the
 *               current set (CSV is the authoritative full snapshot).
 */
export async function mergeSlugs(
  username: string,
  newSlugs: string[],
  source: "scrape" | "csv",
  /** Total films the user has watched. Defaults to slug-set size. */
  explicitFilmCount?: number,
): Promise<UserRecord> {
  const cleanName = normalizeUsername(username);
  const col = await getUsersCollection();
  const now = new Date();
  const existing = await col.findOne({ username: cleanName });

  let merged: string[];
  if (source === "csv" || !existing) {
    merged = Array.from(new Set(newSlugs)).sort();
  } else {
    merged = Array.from(new Set([...existing.watchedSlugs, ...newSlugs])).sort();
  }

  const filmCount = explicitFilmCount ?? merged.length;
  const update: Partial<UserRecord> = {
    username: cleanName,
    watchedSlugs: merged,
    filmCount,
    lastScrapedAt: now,
  };
  if (source === "csv") update.csvUploadedAt = now;

  const setOnInsert: Partial<UserRecord> = { createdAt: now };
  // Only seed csvUploadedAt: null on insert when we're not also setting it.
  if (source !== "csv") setOnInsert.csvUploadedAt = null;

  await col.updateOne(
    { username: cleanName },
    { $set: update, $setOnInsert: setOnInsert },
    { upsert: true },
  );

  return {
    username: cleanName,
    watchedSlugs: merged,
    filmCount,
    csvUploadedAt:
      source === "csv" ? now : (existing?.csvUploadedAt ?? null),
    lastScrapedAt: now,
    createdAt: existing?.createdAt ?? now,
  };
}

/**
 * Scrape page 1 of a user's films grid (~72 most recent) and merge results
 * into Mongo. Throws LetterboxdNotFoundError if the username doesn't exist.
 */
export async function refreshUserFromScrape(
  username: string,
): Promise<UserRecord> {
  const { slugs } = await scrapeRecentFilms(username);
  return mergeSlugs(username, slugs, "scrape");
}

/**
 * Look up a user — refreshing from scrape if their data is stale or missing.
 * For a brand-new username, also verifies the Letterboxd profile exists.
 */
export async function getOrRefreshUser(username: string): Promise<UserRecord> {
  const cleanName = normalizeUsername(username);
  const existing = await getUser(cleanName);
  if (existing) {
    if (Date.now() - new Date(existing.lastScrapedAt).getTime() < STALE_MS) {
      return existing;
    }
    try {
      return await refreshUserFromScrape(cleanName);
    } catch (e) {
      if (e instanceof LetterboxdNotFoundError) {
        // Profile was deleted/renamed since we last saw it. Serve stale.
        return existing;
      }
      throw e;
    }
  }

  // First-time view: verify the profile exists and seed a record from page 1.
  const exists = await letterboxdUserExists(cleanName);
  if (!exists) throw new LetterboxdNotFoundError(cleanName);
  return refreshUserFromScrape(cleanName);
}
