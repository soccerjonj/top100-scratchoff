import { NextRequest } from "next/server";
import {
  renderShareImage,
  type ShareSize,
  type Template,
} from "@/lib/share-image";
import { getUser, normalizeUsername } from "@/lib/user";
import { LISTS } from "@/lib/lists";
import { effectiveWatchedSet, type ListId } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const isListId = (v: string): v is ListId => v in LISTS;
const isSize = (v: string): v is ShareSize =>
  v === "og" || v === "square" || v === "story";
const isTemplate = (v: string): v is Template =>
  v === "current" || v === "a" || v === "b";
const isMode = (v: string): v is "both" | "either" =>
  v === "both" || v === "either";

function intersect(sets: Set<string>[]): string[] {
  if (sets.length === 0) return [];
  const [first, ...rest] = sets;
  return Array.from(first).filter((s) => rest.every((r) => r.has(s)));
}
function union(sets: Set<string>[]): string[] {
  const out = new Set<string>();
  for (const s of sets) for (const v of s) out.add(v);
  return Array.from(out);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ users: string[] }> },
) {
  const { users: rawUsers } = await params;
  // URL is /api/share-image/together/[user1]/[user2]/[list]/...
  // We expect at least 2 usernames + 1 list at the end.
  if (rawUsers.length < 3) {
    return new Response("usage: /together/u1/u2/list", { status: 400 });
  }
  const list = rawUsers[rawUsers.length - 1];
  const usernames = rawUsers
    .slice(0, -1)
    .map(normalizeUsername)
    .filter(Boolean);
  if (!isListId(list)) {
    return new Response("invalid list", { status: 404 });
  }
  for (const u of usernames) {
    if (!/^[a-z0-9_-]+$/.test(u)) {
      return new Response("invalid username", { status: 400 });
    }
  }
  if (usernames.length < 2) {
    return new Response("need at least two usernames", { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const sizeParam = sp.get("size") ?? "og";
  const size: ShareSize = isSize(sizeParam) ? sizeParam : "og";
  const templateParam = sp.get("template") ?? "a";
  const template: Template = isTemplate(templateParam) ? templateParam : "a";
  const modeParam = sp.get("mode") ?? "both";
  const mode = isMode(modeParam) ? modeParam : "both";

  // Resolve everyone's watched set (apply manual overrides).
  const records = await Promise.all(usernames.map((u) => getUser(u)));
  const sets: Set<string>[] = records.map((r) =>
    r
      ? effectiveWatchedSet(r)
      : new Set<string>(),
  );
  const combinedSlugs = mode === "both" ? intersect(sets) : union(sets);

  // Display name combines usernames with a glyph separator. " × " reads
  // nicely on the small badge line in templates A and B.
  const displayName = usernames.join(" × ");

  const res = await renderShareImage({
    size,
    template,
    listId: list,
    watchedSlugs: combinedSlugs,
    username: displayName,
  });

  res.headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=86400",
  );
  if (sp.get("download") === "1") {
    res.headers.set(
      "Content-Disposition",
      `attachment; filename="${usernames.join("-")}-${list}-${size}${template !== "current" ? `-${template}` : ""}.png"`,
    );
  }
  return res;
}
