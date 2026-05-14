import { NextRequest } from "next/server";
import {
  renderShareImage,
  type ShareSize,
  type Template,
} from "@/lib/share-image";
import { getUser, normalizeUsername } from "@/lib/user";
import { LISTS } from "@/lib/lists";
import type { ListId } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const isListId = (v: string): v is ListId => v in LISTS;
const isSize = (v: string): v is ShareSize =>
  v === "og" || v === "square" || v === "story";
const isTemplate = (v: string): v is Template =>
  v === "current" || v === "a" || v === "b";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; list: string }> },
) {
  const { username: rawUsername, list } = await params;
  const username = normalizeUsername(rawUsername);
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return new Response("invalid username", { status: 400 });
  }
  if (!isListId(list)) {
    return new Response("invalid list", { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const sizeParam = sp.get("size") ?? "og";
  const size: ShareSize = isSize(sizeParam) ? sizeParam : "og";
  const templateParam = sp.get("template") ?? "current";
  const template: Template = isTemplate(templateParam) ? templateParam : "current";
  const download = sp.get("download") === "1";

  const user = await getUser(username);
  const res = await renderShareImage({
    size,
    template,
    listId: list,
    watchedSlugs: user?.watchedSlugs ?? [],
    username,
  });

  res.headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=86400",
  );
  if (download) {
    res.headers.set(
      "Content-Disposition",
      `attachment; filename="${username}-${list}-${size}${template !== "current" ? `-${template}` : ""}.png"`,
    );
  }
  return res;
}
