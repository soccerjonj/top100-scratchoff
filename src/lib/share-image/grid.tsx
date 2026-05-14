/**
 * Shared poster grid used by every template.
 *
 * Watched films render their TMDB poster (in color, scaled up, with a gold
 * inset border + outer glow). Unwatched render greyscale + dim. Cell
 * sizing computed by `computeGrid` to fit the host template's available
 * area at roughly a 2:3 aspect.
 */

import type { FilmEntry } from "@/types";

export interface GridSpec {
  cols: number;
  posterW: number;
  posterH: number;
  rankFont: number;
  gap: number;
}

export function computeGridSpec(
  availW: number,
  availH: number,
  total: number,
  gap = 4,
): GridSpec {
  let best: { cols: number; posterW: number; posterH: number } | null = null;
  for (let cols = 6; cols <= 30; cols++) {
    const rows = Math.ceil(total / cols);
    const posterW = (availW - (cols - 1) * gap) / cols;
    const posterH = (availH - (rows - 1) * gap) / rows;
    if (posterH <= 0 || posterW <= 0) continue;
    const actualAspect = posterH / posterW;
    const aspectDelta = Math.abs(actualAspect - 1.5);
    const score =
      aspectDelta + (posterW < 50 ? 0.5 : 0) + (posterW < 30 ? 1 : 0);
    if (
      !best ||
      score < Math.abs(best.posterH / best.posterW - 1.5)
    ) {
      best = { cols, posterW, posterH };
    }
  }
  if (!best) {
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    best = {
      cols,
      posterW: availW / cols - gap,
      posterH: availH / rows - gap,
    };
  }
  const cellW = best.posterW;
  const cellH = Math.min(best.posterH, cellW * 1.5);
  return {
    cols: best.cols,
    posterW: Math.floor(cellW),
    posterH: Math.floor(cellH),
    rankFont: Math.max(10, Math.floor(cellW * 0.3)),
    gap,
  };
}

export function posterUrl(
  posterPath: string | null,
  tier: string,
): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${tier}${posterPath}`;
}

export function pickTier(posterW: number): string {
  return posterW <= 90 ? "w92" : "w185";
}

export function PosterGrid({
  entries,
  watchedSet,
  spec,
  tier,
  width,
  height,
}: {
  entries: FilmEntry[];
  watchedSet: Set<string>;
  spec: GridSpec;
  tier: string;
  width?: number;
  height?: number;
}) {
  // Corner radius scales with poster size — bigger cells get more rounding
  // but the ratio stays subtle so it doesn't read as "rounded-rect UI."
  const radius = Math.max(2, Math.round(spec.posterW * 0.04));
  return (
    <div
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        display: "flex",
        flexWrap: "wrap",
        gap: spec.gap,
        alignContent: "flex-start",
      }}
    >
      {entries.map((entry) => {
        const watched = watchedSet.has(entry.letterboxdSlug);
        const url = posterUrl(entry.posterPath, tier);
        return (
          <div
            key={entry.rank}
            style={{
              width: spec.posterW,
              height: spec.posterH,
              display: "flex",
              position: "relative",
              overflow: "hidden",
              borderRadius: radius,
              background: "#0a0907",
              // Layered shadow:
              //   1. Outer dark drop-shadow lifts watched off the page.
              //   2. Outer gold glow halos them.
              //   3. Thin gold ring is the "edge light."
              // Unwatched get only a very faint inset stroke so they read
              // as a flat panel beneath the watched plane.
              boxShadow: watched
                ? "0 6px 14px rgba(0,0,0,0.55), 0 0 22px rgba(230,185,57,0.55), 0 0 0 1.5px rgba(230,185,57,0.9)"
                : "inset 0 0 0 1px rgba(0,0,0,0.55)",
            }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                width={spec.posterW}
                height={spec.posterH}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: watched
                    ? "saturate(1.25) contrast(1.08)"
                    : "grayscale(100%) brightness(0.26)",
                  opacity: watched ? 1 : 0.42,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: watched ? "#1a1612" : "#070605",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: watched ? "#e6b939" : "#3a3530",
                  fontSize: spec.rankFont * 0.6,
                }}
              >
                #{entry.rank}
              </div>
            )}

            {/* Scratch-off foil overlay on unwatched cells. Subtle diagonal
                gold sheen evokes the physical scratch-card surface that
                inspired the site. */}
            {!watched && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(230,185,57,0.18) 0%, rgba(20,15,8,0.45) 45%, rgba(20,15,8,0.6) 60%, rgba(230,185,57,0.14) 100%)",
                }}
              />
            )}

            {/* Subtle highlight on watched cells (top-left light catch) */}
            {watched && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
