/**
 * Template A — "Editorial magazine cover."
 *
 * Asymmetric composition. Left column carries the editorial copy and a
 * hero percentage typeset in Archivo Black (a heavy display sans for
 * the brag); supporting copy is Inter. Right column carries the poster
 * grid as a framed "filmstrip" element. Subtle radial vignette for
 * depth. Inset stage margin so the design isn't pressed against the
 * canvas edge.
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

const STAGE = 18; // inset from the canvas edge for breathing room

export async function renderTemplateA(ctx: TemplateContext): Promise<{
  element: ReactElement;
  fonts: SatoriFont[];
}> {
  const fonts = await loadFonts([
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
    // Archivo Black is a heavy display sans with character — better for
    // the hero percentage than Inter 900 which still reads "UI."
    { family: "Archivo Black", weight: 400, as: "ArchivoBlack" },
  ]);

  const isHorizontal = ctx.w > ctx.h;
  const element = isHorizontal ? horizontalLayout(ctx) : verticalLayout(ctx);
  return { element, fonts };
}

function horizontalLayout(ctx: TemplateContext): ReactElement {
  const effW = ctx.w - STAGE * 2;
  const effH = ctx.h - STAGE * 2;
  const leftW = Math.round(effW * 0.38);
  const rightW = effW - leftW;
  const list = LISTS[ctx.listId];
  const gridPad = 26;
  const spec = computeGridSpec(
    rightW - gridPad * 2,
    effH - gridPad * 2,
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
        padding: STAGE,
        position: "relative",
        color: TEXT,
        fontFamily: "Inter",
      }}
    >
      <Vignette />
      <div
        style={{
          width: effW,
          height: effH,
          display: "flex",
          position: "relative",
          boxShadow: "inset 0 0 0 1px rgba(230,185,57,0.14)",
        }}
      >
        <LeftEditorial ctx={ctx} width={leftW} height={effH} />
        <div
          style={{
            width: rightW,
            height: effH,
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
    </div>
  );
}

function verticalLayout(ctx: TemplateContext): ReactElement {
  const effW = ctx.w - STAGE * 2;
  const effH = ctx.h - STAGE * 2;
  const isStory = ctx.h > ctx.w * 1.5;
  const heroH = isStory ? Math.round(effH * 0.32) : Math.round(effH * 0.38);
  const gridH = effH - heroH;
  const gridPad = ctx.w >= 1080 ? 40 : 26;
  const list = LISTS[ctx.listId];
  const spec = computeGridSpec(
    effW - gridPad * 2,
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
        padding: STAGE,
        position: "relative",
        color: TEXT,
        fontFamily: "Inter",
      }}
    >
      <Vignette />
      <div
        style={{
          width: effW,
          height: effH,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "inset 0 0 0 1px rgba(230,185,57,0.14)",
        }}
      >
        <TopEditorial ctx={ctx} height={heroH} width={effW} />
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
    </div>
  );
}

function Vignette() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(circle at 30% 50%, rgba(230,185,57,0.07) 0%, rgba(0,0,0,0) 55%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)",
      }}
    />
  );
}

function LeftEditorial({
  ctx,
  width,
  height,
}: {
  ctx: TemplateContext;
  width: number;
  height: number;
}) {
  const pad = 42;
  return (
    <div
      style={{
        width,
        height,
        padding: `${pad}px ${pad}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top: small wordmark in Archivo Black */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          color: GOLD,
          letterSpacing: 3,
          fontFamily: "ArchivoBlack",
        }}
      >
        <span>TOP/100</span>
        <span style={{ width: 24, height: 1.5, background: GOLD_DIM }} />
        <span style={{ color: TEXT_MUTED, letterSpacing: 2, fontFamily: "Inter", fontWeight: 700, fontSize: 12 }}>
          SCRATCH-OFF
        </span>
      </div>

      {/* Middle: editorial title + hero stat */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: 20,
            color: TEXT,
            letterSpacing: 2.5,
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 6,
            fontFamily: "Inter",
          }}
        >
          {ctx.listTitle}
        </div>
        <div
          style={{
            fontSize: 230,
            fontFamily: "ArchivoBlack",
            color: GOLD,
            lineHeight: 0.82,
            letterSpacing: -6,
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
            marginTop: 4,
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
          fontSize: 15,
          color: TEXT_MUTED,
          letterSpacing: 1,
        }}
      >
        <span style={{ color: TEXT, fontWeight: 700 }}>{ctx.username}</span>
        <span style={{ color: GOLD_DIM }}>✦</span>
        <span style={{ fontSize: 13 }}>top100scratchoff.com</span>
      </div>
    </div>
  );
}

function TopEditorial({
  ctx,
  height,
  width,
}: {
  ctx: TemplateContext;
  height: number;
  width: number;
}) {
  const pad = ctx.w >= 1080 ? 50 : 36;
  const isStory = ctx.h > ctx.w * 1.5;
  const heroFont = isStory ? 360 : 280;
  return (
    <div
      style={{
        width,
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
          gap: 12,
          fontSize: 16,
          color: GOLD,
          letterSpacing: 4,
          fontFamily: "ArchivoBlack",
        }}
      >
        <span>TOP/100</span>
        <span style={{ width: 32, height: 1.5, background: GOLD_DIM }} />
        <span style={{ color: TEXT_MUTED, fontFamily: "Inter", fontWeight: 700, letterSpacing: 3, fontSize: 14 }}>
          SCRATCH-OFF
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 26,
            color: TEXT,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 700,
            fontFamily: "Inter",
          }}
        >
          {ctx.listTitle}
        </div>
        <div
          style={{
            fontSize: heroFont,
            fontFamily: "ArchivoBlack",
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
            gap: 14,
            color: TEXT_MUTED,
            fontSize: 22,
          }}
        >
          <span style={{ color: TEXT, fontWeight: 700 }}>{ctx.watched}</span>
          <span>of {ctx.total} watched</span>
          <span style={{ marginLeft: "auto", color: GOLD_DIM, fontSize: 18 }}>
            via {ctx.username}
          </span>
        </div>
      </div>
    </div>
  );
}
