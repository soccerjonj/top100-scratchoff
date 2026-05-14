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
  /** Container width (px). If passed, grid fills it. */
  width?: number;
  /** Container height (px). */
  height?: number;
}) {
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
              background: "#111",
              transform: watched ? "scale(1.06)" : "scale(1)",
              zIndex: watched ? 1 : 0,
              boxShadow: watched
                ? "inset 0 0 0 2px #d4af37, 0 0 14px rgba(212,175,55,0.55)"
                : "inset 0 0 0 1px rgba(255,255,255,0.04)",
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
                    ? "saturate(1.2) contrast(1.05)"
                    : "grayscale(100%) brightness(0.3)",
                  opacity: watched ? 1 : 0.38,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: watched ? "#222" : "#0b0b0f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: watched ? "#d4af37" : "#333",
                  fontSize: spec.rankFont * 0.6,
                }}
              >
                #{entry.rank}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
