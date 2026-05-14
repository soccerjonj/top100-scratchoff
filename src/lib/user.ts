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
    manualWatched: existing?.manualWatched ?? [],
    manualUnwatched: existing?.manualUnwatched ?? [],
  };
}

/**
 * Toggle a slug in the user's manual watched/unwatched override sets.
 * The new state is applied as a delta: if the slug is already in one
 * override list, it's moved/removed appropriately.
 *
 * Returns the updated record so the API route can echo back the
 * resulting state to the client.
 */
export async function setManualWatchedState(
  username: string,
  slug: string,
  watched: boolean,
): Promise<UserRecord | null> {
  const cleanName = normalizeUsername(username);
  if (!/^[a-z0-9_-]+$/.test(cleanName)) return null;
  const col = await getUsersCollection();
  const existing = await col.findOne({ username: cleanName });
  if (!existing) return null;

  const inAuto = existing.watchedSlugs.includes(slug);
  const manualWatched = new Set(existing.manualWatched ?? []);
  const manualUnwatched = new Set(existing.manualUnwatched ?? []);

  if (watched) {
    // Want it watched.
    manualUnwatched.delete(slug);
    if (!inAuto) manualWatched.add(slug);
    else manualWatched.delete(slug); // auto already covers it
  } else {
    // Want it unwatched.
    manualWatched.delete(slug);
    if (inAuto) manualUnwatched.add(slug);
    else manualUnwatched.delete(slug); // never was watched
  }

  const update = {
    manualWatched: Array.from(manualWatched).sort(),
    manualUnwatched: Array.from(manualUnwatched).sort(),
  };
  await col.updateOne({ username: cleanName }, { $set: update });

  return { ...existing, ...update } as UserRecord;
}

/**
 * Convert a guest record into a real Letterboxd-tied record. Used when a
 * real Letterboxd user finds their preferred nickname has been claimed by
 * a guest and wants to take it over.
 *
 * Behaviour:
 *  - Verifies the Letterboxd profile actually exists
 *  - Wipes the guest's manual marks (the guest is someone else)
 *  - Flips isGuest off, runs a fresh scrape
 *  - Throws LetterboxdNotFoundError if there's no real profile at that name
 *  - Returns null if no guest record exists to claim
 */
export async function claimGuestAsLetterboxd(
  username: string,
): Promise<UserRecord | null> {
  const cleanName = normalizeUsername(username);
  const col = await getUsersCollection();
  const existing = await col.findOne({ username: cleanName });
  if (!existing || !existing.isGuest) return null;

  // Verify a real Letterboxd account exists at this name. Throws if not.
  const exists = await letterboxdUserExists(cleanName);
  if (!exists) throw new LetterboxdNotFoundError(cleanName);

  await col.updateOne(
    { username: cleanName },
    {
      $set: {
        isGuest: false,
        manualWatched: [],
        manualUnwatched: [],
      },
    },
  );

  // Seed with a fresh scrape so the new owner sees their real recent watches.
  return refreshUserFromScrape(cleanName);
}

/**
 * Create a minimal "guest" user record for someone without a Letterboxd
 * profile. Manual-tracking only — no scrape data, no CSV. The username
 * just acts as a unique key; if the Letterboxd profile later starts
 * existing, the same record gets enriched via scrape.
 */
export async function ensureGuestUser(username: string): Promise<UserRecord> {
  const cleanName = normalizeUsername(username);
  const col = await getUsersCollection();
  const now = new Date();
  await col.updateOne(
    { username: cleanName },
    {
      $setOnInsert: {
        username: cleanName,
        watchedSlugs: [],
        filmCount: 0,
        csvUploadedAt: null,
        lastScrapedAt: now,
        createdAt: now,
        manualWatched: [],
        manualUnwatched: [],
        isGuest: true,
      },
    },
    { upsert: true },
  );
  const found = await col.findOne(
    { username: cleanName },
    { projection: { _id: 0 } },
  );
  return found!;
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
    // Guest records have no Letterboxd profile — skip all scrape attempts.
    if (existing.isGuest) return existing;
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
