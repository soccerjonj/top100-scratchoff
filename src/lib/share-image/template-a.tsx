/**
 * Template A — "Editorial magazine cover."
 *
 * Asymmetric composition. Left column carries the editorial copy and a
 * hero percentage. Right column carries the poster grid as a framed
 * "filmstrip" element. Inter Display (geometric sans) for type. Subtle
 * radial vignette for depth.
 *
 * For square / story sizes, the columns become stacked rows (top hero,
 * bottom grid).
 */

import type { ReactElement } from "react";
import { LISTS } from "@/lib/lists";
import { computeGridSpec, PosterGrid, pickTier } from "./grid";
import { loadFonts, type SatoriFont } from "./fonts";
import type { TemplateContext } from "./index";

const BG = "#0a0907"; // warmer near-black so gold reads warm
const GOLD = "#e6b939";
const GOLD_DIM = "#8c7426";
const TEXT = "#f4eee5";
const TEXT_MUTED = "#8c8478";

export async function renderTemplateA(ctx: TemplateContext): Promise<{
  element: ReactElement;
  fonts: SatoriFont[];
}> {
  const fonts = await loadFonts([
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
    { family: "Inter", weight: 900 },
  ]);

  const isHorizontal = ctx.w > ctx.h; // og
  if (isHorizontal) return { element: horizontalLayout(ctx), fonts };
  return { element: verticalLayout(ctx), fonts };
}

function horizontalLayout(ctx: TemplateContext): ReactElement {
  // OG 1200×630: split into 38% / 62%
  const leftW = Math.round(ctx.w * 0.38);
  const rightW = ctx.w - leftW;
  const list = LISTS[ctx.listId];
  const gridPad = 30;
  const spec = computeGridSpec(
    rightW - gridPad * 2,
    ctx.h - gridPad * 2,
    list.entries.length,
    4,
  );
  const tier = pickTier(spec.posterW);
  const watchedSet = new Set(ctx.watchedSlugs);

  return (
    <div
      style={{
        width: ctx.w,
        height: ctx.h,
        display: "flex",
        background: BG,
        color: TEXT,
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      <Vignette />
      <LeftEditorial ctx={ctx} width={leftW} />
      <div
        style={{
          width: rightW,
          height: ctx.h,
          display: "flex",
          padding: gridPad,
          borderLeft: "1px solid rgba(230,185,57,0.12)",
        }}
      >
        <PosterGrid
          entries={list.entries}
          watchedSet={watchedSet}
          spec={spec}
          tier={tier}
        />
      </div>
    </div>
  );
}

function verticalLayout(ctx: TemplateContext): ReactElement {
  // square / story: top hero band, bottom grid
  const isStory = ctx.h > ctx.w * 1.5;
  const heroH = isStory ? Math.round(ctx.h * 0.32) : Math.round(ctx.h * 0.38);
  const gridH = ctx.h - heroH;
  const gridPad = ctx.w >= 1080 ? 50 : 30;
  const list = LISTS[ctx.listId];
  const spec = computeGridSpec(
    ctx.w - gridPad * 2,
    gridH - gridPad * 2,
    list.entries.length,
    4,
  );
  const tier = pickTier(spec.posterW);
  const watchedSet = new Set(ctx.watchedSlugs);

  return (
    <div
      style={{
        width: ctx.w,
        height: ctx.h,
        display: "flex",
        flexDirection: "column",
        background: BG,
        color: TEXT,
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      <Vignette />
      <TopEditorial ctx={ctx} height={heroH} />
      <div
        style={{
          height: gridH,
          padding: gridPad,
          display: "flex",
          borderTop: "1px solid rgba(230,185,57,0.12)",
        }}
      >
        <PosterGrid
          entries={list.entries}
          watchedSet={watchedSet}
          spec={spec}
          tier={tier}
        />
      </div>
    </div>
  );
}

function Vignette() {
  // Subtle radial gradient to give the background depth without distracting
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(circle at 30% 50%, rgba(230,185,57,0.06) 0%, rgba(0,0,0,0) 55%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 60%)",
      }}
    />
  );
}

function LeftEditorial({
  ctx,
  width,
}: {
  ctx: TemplateContext;
  width: number;
}) {
  // For 1200×630 horizontal layout
  const pad = 48;
  return (
    <div
      style={{
        width,
        height: ctx.h,
        padding: `${pad}px ${pad}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top: small wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          color: GOLD,
          letterSpacing: 4,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        <span>TOP/100</span>
        <span
          style={{ width: 24, height: 1, background: GOLD_DIM }}
        />
        <span style={{ color: TEXT_MUTED, letterSpacing: 3 }}>
          SCRATCH-OFF
        </span>
      </div>

      {/* Middle: editorial title + hero stat */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: 22,
            color: TEXT,
            letterSpacing: 3,
            fontWeight: 400,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {ctx.listTitle}
        </div>
        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            color: GOLD,
            lineHeight: 0.82,
            letterSpacing: -8,
            display: "flex",
          }}
        >
          {ctx.pct}%
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: TEXT_MUTED,
            fontSize: 18,
            fontWeight: 400,
            marginTop: 2,
          }}
        >
          <span style={{ color: TEXT, fontWeight: 700 }}>{ctx.watched}</span>
          <span>of {ctx.total} watched</span>
        </div>
      </div>

      {/* Bottom: byline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 16,
          color: TEXT_MUTED,
          letterSpacing: 1,
        }}
      >
        <span style={{ color: TEXT, fontWeight: 700 }}>{ctx.username}</span>
        <span style={{ color: GOLD_DIM }}>✦</span>
        <span style={{ fontSize: 14 }}>top100scratchoff.com</span>
      </div>
    </div>
  );
}

function TopEditorial({
  ctx,
  height,
}: {
  ctx: TemplateContext;
  height: number;
}) {
  const pad = ctx.w >= 1080 ? 60 : 40;
  const isStory = ctx.h > ctx.w * 1.5;
  const heroFont = isStory ? 360 : 280;
  return (
    <div
      style={{
        height,
        padding: `${pad}px ${pad}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 16,
          color: GOLD,
          letterSpacing: 5,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        <span>TOP/100</span>
        <span style={{ width: 32, height: 1, background: GOLD_DIM }} />
        <span style={{ color: TEXT_MUTED, letterSpacing: 4 }}>
          SCRATCH-OFF
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 26,
            color: TEXT,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          {ctx.listTitle}
        </div>
        <div
          style={{
            fontSize: heroFont,
            fontWeight: 900,
            color: GOLD,
            lineHeight: 0.82,
            letterSpacing: -10,
            display: "flex",
          }}
        >
          {ctx.pct}%
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: TEXT_MUTED,
            fontSize: 22,
          }}
        >
          <span style={{ color: TEXT, fontWeight: 700 }}>{ctx.watched}</span>
          <span>of {ctx.total} watched</span>
          <span style={{ marginLeft: "auto", color: GOLD_DIM }}>
            via {ctx.username}
          </span>
        </div>
      </div>
    </div>
  );
}
