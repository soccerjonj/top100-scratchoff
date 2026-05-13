import { renderShareImage } from "@/lib/share-image";
import { getUser, normalizeUsername } from "@/lib/user";
import { LISTS } from "@/lib/lists";
import type { ListId } from "@/types";

export const alt = "Top 100 Scratch-Off — watched-films share image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const isListId = (v: string): v is ListId => v in LISTS;

export default async function OG({
  params,
}: {
  params: Promise<{ username: string; list: string }>;
}) {
  const { username: rawUsername, list } = await params;
  const username = normalizeUsername(rawUsername);
  const listId: ListId = isListId(list) ? list : "imdb-top-100";
  const user = await getUser(username);
  return renderShareImage({
    size: "og",
    listId,
    watchedSlugs: user?.watchedSlugs ?? [],
    username,
  });
}
