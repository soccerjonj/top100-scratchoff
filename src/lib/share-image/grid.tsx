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

/**
 * `preferredCols`, if passed, is honored unconditionally. Use it when the
 * total has an obvious clean factorisation (e.g. 100 → 10 cols × 10 rows,
 * 500 → 25 × 20) so the bottom row isn't left with a single orphan poster.
 */
export function computeGridSpec(
  availW: number,
  availH: number,
  total: number,
  gap = 4,
  preferredCols?: number,
): GridSpec {
  let chosen: { cols: number; posterW: number; posterH: number };

  // Try preferred cols first, but only honor it if the resulting cells can
  // hold a 2:3 poster aspect without overflowing the canvas. Otherwise the
  // canvas would force squished landscape cells (common on horizontal OG)
  // — fall back to aspect-search in that case.
  const preferredFits = (() => {
    if (!preferredCols || preferredCols <= 0) return null;
    const cols = preferredCols;
    const rows = Math.ceil(total / cols);
    const posterW = (availW - (cols - 1) * gap) / cols;
    const naturalH = posterW * 1.5;
    const totalH = naturalH * rows + gap * (rows - 1);
    if (totalH > availH) return null; // 2:3 won't fit
    return { cols, posterW, posterH: naturalH };
  })();

  if (preferredFits) {
    chosen = preferredFits;
  } else {
    let best: { cols: number; posterW: number; posterH: number; score: number } | null = null;
    for (let cols = 6; cols <= 30; cols++) {
      const rows = Math.ceil(total / cols);
      const posterW = (availW - (cols - 1) * gap) / cols;
      const posterH = (availH - (rows - 1) * gap) / rows;
      if (posterH <= 0 || posterW <= 0) continue;
      const actualAspect = posterH / posterW;
      const aspectDelta = Math.abs(actualAspect - 1.5);
      const dividesEvenly = total % cols === 0;
      const score =
        aspectDelta +
        (dividesEvenly ? 0 : 0.6) +
        (posterW < 50 ? 0.5 : 0) +
        (posterW < 30 ? 1 : 0);
      if (!best || score < best.score) {
        best = { cols, posterW, posterH, score };
      }
    }
    if (!best) {
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      best = {
        cols,
        posterW: availW / cols - gap,
        posterH: availH / rows - gap,
        score: 0,
      };
    }
    chosen = best;
  }

  // Respect the 2:3 poster aspect: cap the cell HEIGHT at width × 1.5 so
  // the image isn't stretched vertically. If the algorithm gave us tall
  // cells, we accept the empty space. We never grow the cell wider than
  // available, so posters never spill out.
  const cellW = chosen.posterW;
  const cellH = Math.min(chosen.posterH, cellW * 1.5);
  return {
    cols: chosen.cols,
    posterW: Math.floor(cellW),
    posterH: Math.floor(cellH),
    rankFont: Math.max(10, Math.floor(cellW * 0.3)),
    gap,
  };
}

/** Sensible default preferred column counts for known list sizes. */
export function preferredColsFor(total: number): number | undefined {
  if (total === 100) return 10;
  if (total === 500) return 25;
  return undefined;
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
              // Watched cells: a clean dark drop-shadow lifts them off the
              // background plus a hairline gold edge for definition. The
              // earlier gold glow halo read as garish; dropped it. The
              // visual hierarchy now comes from poster color/saturation
              // contrast vs the dim foil-overlay unwatched.
              boxShadow: watched
                ? "0 6px 16px rgba(0,0,0,0.7), 0 0 0 1px rgba(230,185,57,0.6)"
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
                    ? "saturate(1.35) contrast(1.1) brightness(1.05)"
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
