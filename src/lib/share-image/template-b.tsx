/**
 * Template B — "Cinema poster."
 *
 * Centered, vertical hierarchy that evokes a film poster. Serif title at
 * top (Playfair Display, italic), framed grid in the middle, hero stat
 * at the bottom. Heavier dark frame around the grid so it reads as the
 * "poster art." More dramatic, more traditional.
 */

import type { ReactElement } from "react";
import { LISTS } from "@/lib/lists";
import {
  computeGridSpec,
  PosterGrid,
  pickTier,
  preferredColsFor,
} from "./grid";
import { loadFonts, type SatoriFont } from "./fonts";
import type { TemplateContext } from "./index";

const BG = "#070605";
const FRAME = "#1c1916";
const GOLD = "#e6b939";
const GOLD_DIM = "#8c7426";
const TEXT = "#f5efe2";
const TEXT_MUTED = "#857b6b";

export async function renderTemplateB(ctx: TemplateContext): Promise<{
  element: ReactElement;
  fonts: SatoriFont[];
}> {
  const fonts = await loadFonts([
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
    // Use Playfair Display for the serif title (it's free + classic editorial)
    { family: "Playfair Display", weight: 700, italic: true, as: "Playfair" },
    { family: "Playfair Display", weight: 900, as: "Playfair" },
  ]);

  return { element: layout(ctx), fonts };
}

function layout(ctx: TemplateContext): ReactElement {
  const isHorizontal = ctx.w > ctx.h;
  const isStory = ctx.h > ctx.w * 1.5;
  const padX = ctx.w >= 1080 ? 60 : 40;
  const padY = ctx.w >= 1080 ? 50 : 30;

  // Band heights scale with canvas
  const topH = isHorizontal
    ? Math.round(ctx.h * 0.18)
    : isStory
      ? Math.round(ctx.h * 0.14)
      : Math.round(ctx.h * 0.16);
  const bottomH = isHorizontal
    ? Math.round(ctx.h * 0.22)
    : isStory
      ? Math.round(ctx.h * 0.18)
      : Math.round(ctx.h * 0.2);
  const middleH = ctx.h - topH - bottomH;

  const list = LISTS[ctx.listId];
  // The grid sits inside a "frame" with internal padding
  const framePad = 14;
  const gridAvailW = ctx.w - padX * 2 - framePad * 2;
  const gridAvailH = middleH - padY - framePad * 2;
  const spec = computeGridSpec(
    gridAvailW,
    gridAvailH,
    list.entries.length,
    4,
    preferredColsFor(list.entries.length),
  );
  const tier = pickTier(spec.posterW);
  const watchedSet = new Set(ctx.watchedSlugs);

  // Title font scales with canvas width
  const titleFont = isHorizontal
    ? Math.round(ctx.w * 0.038)
    : Math.round(ctx.w * 0.05);
  const heroFont = isHorizontal
    ? Math.round(ctx.w * 0.085)
    : Math.round(ctx.w * 0.13);

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
      <BgGradient />

      {/* TOP: serif title band */}
      <div
        style={{
          height: topH,
          padding: `0 ${padX}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: GOLD,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Wellwatched score
        </div>
        <div
          style={{
            fontFamily: "Playfair",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: titleFont,
            color: TEXT,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {ctx.listTitle}
        </div>
        <div
          style={{
            width: 64,
            height: 2,
            background: GOLD,
            marginTop: 6,
          }}
        />
      </div>

      {/* MIDDLE: framed grid */}
      <div
        style={{
          height: middleH,
          padding: `0 ${padX}px ${padY}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            background: FRAME,
            padding: framePad,
            boxShadow:
              "inset 0 0 0 1px rgba(230,185,57,0.25), 0 8px 30px rgba(0,0,0,0.6)",
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

      {/* BOTTOM: hero percentage + tagline */}
      <div
        style={{
          height: bottomH,
          padding: `0 ${padX}px ${padY * 0.7}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 18,
          }}
        >
          <span
            style={{
              fontFamily: "Playfair",
              fontWeight: 900,
              color: GOLD,
              fontSize: heroFont,
              lineHeight: 0.9,
              letterSpacing: -3,
            }}
          >
            {ctx.watched}
          </span>
          <span
            style={{
              fontFamily: "Playfair",
              fontWeight: 700,
              color: TEXT_MUTED,
              fontSize: Math.round(heroFont * 0.55),
            }}
          >
            / {ctx.total}
          </span>
          <span
            style={{
              fontWeight: 700,
              color: TEXT,
              fontSize: Math.round(heroFont * 0.3),
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {ctx.pct}% watched
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: TEXT_MUTED,
            fontSize: 14,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          <span style={{ color: TEXT }}>{ctx.username}</span>
          <span style={{ color: GOLD_DIM }}>·</span>
          <span>wellwatched.app</span>
        </div>
      </div>
    </div>
  );
}

function BgGradient() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at center, rgba(230,185,57,0.04) 0%, rgba(7,6,5,0) 65%)",
      }}
    />
  );
}
