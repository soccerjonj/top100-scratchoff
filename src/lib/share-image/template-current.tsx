/**
 * Original layout kept as the default while we compare templates.
 * Top stripe with username + list + big watched/total stat, then the grid
 * fills the rest, then a brand mark at the bottom. System sans-serif.
 */

import type { ReactElement } from "react";
import { LISTS } from "@/lib/lists";
import {
  computeGridSpec,
  PosterGrid,
  pickTier,
  preferredColsFor,
} from "./grid";
import type { TemplateContext } from "./index";

const SITE_URL = "wellwatched.app";

export async function renderTemplateCurrent(ctx: TemplateContext): Promise<{
  element: ReactElement;
  fonts: undefined;
}> {
  const padX = ctx.w >= 1080 ? 60 : 40;
  const headerH = Math.round(ctx.h * 0.28);
  const brandH = 50;
  const list = LISTS[ctx.listId];
  const spec = computeGridSpec(
    ctx.w - padX * 2,
    ctx.h - headerH - brandH,
    list.entries.length,
    4,
    preferredColsFor(list.entries.length),
  );
  const tier = pickTier(spec.posterW);
  const watchedSet = new Set(ctx.watchedSlugs);

  const titleFont = Math.round(ctx.w * 0.032);
  const statFont = Math.round(ctx.w * 0.06);

  const element = (
    <div
      style={{
        width: ctx.w,
        height: ctx.h,
        display: "flex",
        flexDirection: "column",
        background: "#0b0b0f",
        color: "#f5f5f7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          height: headerH,
          padding: `0 ${padX}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          borderBottom: "1px solid rgba(212,175,55,0.25)",
        }}
      >
        <div
          style={{
            fontSize: titleFont,
            fontWeight: 600,
            color: "#d4af37",
            display: "flex",
          }}
        >
          <span style={{ color: "#f5f5f7" }}>{ctx.username}</span>
          <span style={{ color: "#555", margin: "0 12px" }}>·</span>
          <span>{ctx.listTitle}</span>
        </div>
        <div
          style={{
            fontSize: statFont,
            fontWeight: 800,
            color: "#d4af37",
            lineHeight: 1,
            display: "flex",
            alignItems: "baseline",
            gap: 18,
          }}
        >
          <span>
            {ctx.watched}
            <span style={{ color: "#555", fontWeight: 600 }}> / {ctx.total}</span>
          </span>
          <span
            style={{
              fontSize: statFont * 0.45,
              color: "#888",
              fontWeight: 600,
            }}
          >
            {ctx.pct}% watched
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: `${spec.gap * 4}px ${padX}px`,
          display: "flex",
        }}
      >
        <PosterGrid
          entries={list.entries}
          watchedSet={watchedSet}
          spec={spec}
          tier={tier}
        />
      </div>

      <div
        style={{
          padding: `12px ${padX}px 18px`,
          fontSize: Math.round(ctx.w * 0.018),
          color: "#888",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{SITE_URL}</span>
        <span style={{ color: "#d4af37" }}>track & share</span>
      </div>
    </div>
  );

  return { element, fonts: undefined };
}
