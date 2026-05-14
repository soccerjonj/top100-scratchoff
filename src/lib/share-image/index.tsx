/**
 * Share image renderer dispatcher.
 *
 * Three templates currently:
 *   current — original engineer-y dashboard layout (kept as default while
 *             we A/B compare)
 *   a       — editorial magazine cover (asymmetric, hero percentage, Inter)
 *   b       — cinema poster (centered, serif title, Playfair Display)
 *
 * Switch via ?template=a|b on the share-image endpoint.
 */

import { ImageResponse } from "next/og";
import type { ListId } from "@/types";
import { LISTS } from "@/lib/lists";
import { renderTemplateCurrent } from "./template-current";
import { renderTemplateA } from "./template-a";
import { renderTemplateB } from "./template-b";

export type ShareSize = "og" | "square" | "story";
export type Template = "current" | "a" | "b";

export interface CanvasSize {
  w: number;
  h: number;
}

export const SIZES: Record<ShareSize, CanvasSize> = {
  og: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

export interface ShareImageOpts {
  size: ShareSize;
  template?: Template;
  listId: ListId;
  watchedSlugs: string[];
  username: string;
}

export interface TemplateContext extends CanvasSize {
  username: string;
  listTitle: string;
  watched: number;
  total: number;
  pct: number;
  listId: ListId;
  watchedSlugs: string[];
}

export async function renderShareImage({
  size,
  template = "current",
  listId,
  watchedSlugs,
  username,
}: ShareImageOpts): Promise<Response> {
  const list = LISTS[listId];
  const canvas = SIZES[size];
  const watchedSet = new Set(watchedSlugs);
  const watched = list.entries.filter((e) =>
    watchedSet.has(e.letterboxdSlug),
  ).length;
  const total = list.entries.length;
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);

  const ctx: TemplateContext = {
    ...canvas,
    username,
    listTitle: list.title,
    watched,
    total,
    pct,
    listId,
    watchedSlugs,
  };

  const tpl = template === "a" ? renderTemplateA
            : template === "b" ? renderTemplateB
            : renderTemplateCurrent;

  const { element, fonts } = await tpl(ctx);

  return new ImageResponse(element, {
    width: canvas.w,
    height: canvas.h,
    fonts,
  });
}
