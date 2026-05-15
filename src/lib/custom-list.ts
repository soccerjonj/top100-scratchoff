/**
 * Custom-list helpers — wrap the scraper + Mongo so the API routes and
 * the page-level data fetcher share one path.
 */

import { createHash } from "node:crypto";
import { getCustomListsCollection, getUsersCollection } from "@/lib/mongo";
import { scrapeLetterboxdList, parseLetterboxdListUrl } from "@/lib/letterboxd-list";
import type { CustomListRecord } from "@/types";

const MAX_LISTS_PER_USER = 10;

/** Stable id derived from the canonical URL. Same url → same id. */
function hashUrl(canonical: string): string {
  return createHash("sha1").update(canonical).digest("hex").slice(0, 16);
}

export class TooManyListsError extends Error {}
export class NoSuchListError extends Error {}

/**
 * Add a custom list to a user's profile. Re-uses the cached scrape if
 * the same URL was added by anyone else in the last day.
 */
export async function addCustomListToUser(
  username: string,
  rawUrl: string,
): Promise<CustomListRecord> {
  const lists = await getCustomListsCollection();
  const users = await getUsersCollection();

  const { canonical } = parseLetterboxdListUrl(rawUrl);
  const id = hashUrl(canonical);

  const userDoc = await users.findOne({ username });
  const current = userDoc?.customListIds ?? [];
  if (current.length >= MAX_LISTS_PER_USER && !current.includes(id)) {
    throw new TooManyListsError(
      `Limit is ${MAX_LISTS_PER_USER} custom lists per profile`,
    );
  }

  // Check cache. Re-scrape if older than 24h.
  const cached = await lists.findOne({ id });
  let record: CustomListRecord;
  const STALE_MS = 24 * 60 * 60 * 1000;
  if (
    cached &&
    Date.now() - new Date(cached.scrapedAt).getTime() < STALE_MS
  ) {
    record = cached;
  } else {
    const scraped = await scrapeLetterboxdList(canonical);
    record = {
      id,
      url: scraped.url,
      title: scraped.title,
      entries: scraped.entries,
      scrapedAt: new Date(),
    };
    await lists.updateOne({ id }, { $set: record }, { upsert: true });
  }

  // Attach to user (idempotent — addToSet)
  await users.updateOne(
    { username },
    { $addToSet: { customListIds: id } },
  );

  return record;
}

export async function removeCustomListFromUser(
  username: string,
  id: string,
): Promise<void> {
  const users = await getUsersCollection();
  await users.updateOne({ username }, { $pull: { customListIds: id } });
  // Note: we don't delete from the shared customLists collection in case
  // other users have it attached. A periodic janitor could prune
  // orphaned lists if storage gets tight.
}

export async function getCustomListsForUser(
  ids: string[],
): Promise<CustomListRecord[]> {
  if (!ids || ids.length === 0) return [];
  const lists = await getCustomListsCollection();
  const docs = (await lists
    .find({ id: { $in: ids } }, { projection: { _id: 0 } })
    .toArray()) as unknown as CustomListRecord[];
  const map = new Map(docs.map((d) => [d.id, d]));
  // Preserve the order the user added them in.
  const out: CustomListRecord[] = [];
  for (const id of ids) {
    const d = map.get(id);
    if (d) out.push(d);
  }
  return out;
}
