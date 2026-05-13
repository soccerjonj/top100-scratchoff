/**
 * Server-side renderer for the "scratch-off" share image.
 *
 * Three sizes share one composition (header + grid). Watched films render
 * their TMDB poster; unwatched ones render as a gold-on-black tile with the
 * film's rank — mirroring the physical scratch-off poster that inspired the
 * site.
 *
 * Constraints (Satori, the renderer behind next/og):
 *  - No `next/image` — plain <img> with absolute HTTPS URLs only.
 *  - No CSS `filter:` — hence the gold-tile design instead of grayscale.
 *  - Flexbox layout only; elements with multiple children need an explicit
 *    `display: 'flex'`.
 */

import { ImageResponse } from "next/og";
import type { FilmEntry, ListId } from "@/types";
import { LISTS } from "@/lib/lists";

export type ShareSize = "og" | "square" | "story";

interface SizeSpec {
  w: number;
  h: number;
  headerH: number;
  cols: number; // computed off entries.length
  posterW: number;
  posterH: number;
  rankFont: number;
  gap: number;
  titleFont: number;
  statFont: number;
  brandFont: number;
  padX: number;
}

const SITE_URL = "top100scratchoff.com";

const BASE: Record<ShareSize, Omit<SizeSpec, "cols" | "posterW" | "posterH" | "rankFont">> = {
  og: { w: 1200, h: 630, headerH: 200, gap: 4, titleFont: 38, statFont: 64, brandFont: 22, padX: 60 },
  square: { w: 1080, h: 1080, headerH: 240, gap: 4, titleFont: 42, statFont: 96, brandFont: 24, padX: 60 },
  story: { w: 1080, h: 1920, headerH: 360, gap: 6, titleFont: 46, statFont: 120, brandFont: 26, padX: 80 },
};

function computeGrid(spec: Omit<SizeSpec, "cols" | "posterW" | "posterH" | "rankFont">, total: number): SizeSpec {
  // Pick a column count so the grid roughly fills the available space at a 2:3 aspect.
  // Available: (w - 2*padX) wide, (h - headerH - padding) tall.
  const availW = spec.w - spec.padX * 2;
  const availH = spec.h - spec.headerH - 40; // bottom padding for brand line
  // For N items, pick cols so cols * rows ~ N AND aspect of cell is ~2:3.
  // cell width = availW / cols ; cell height = (availH - (rows-1)*gap) / rows
  // we want cell height = 1.5 * cell width
  // rows = ceil(N / cols), so iterate cols 8..30 and pick best fit
  let best: { cols: number; posterW: number; posterH: number } | null = null;
  for (let cols = 6; cols <= 30; cols++) {
    const rows = Math.ceil(total / cols);
    const posterW = (availW - (cols - 1) * spec.gap) / cols;
    const posterH = (availH - (rows - 1) * spec.gap) / rows;
    if (posterH <= 0 || posterW <= 0) continue;
    const actualAspect = posterH / posterW;
    const aspectDelta = Math.abs(actualAspect - 1.5);
    // Prefer aspect ratios near 1.5; penalize too-narrow posters
    const score = aspectDelta + (posterW < 50 ? 0.5 : 0) + (posterW < 30 ? 1 : 0);
    if (!best || score < (Math.abs((best.posterH / best.posterW) - 1.5))) {
      best = { cols, posterW, posterH };
    }
  }
  if (!best) {
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    best = {
      cols,
      posterW: availW / cols - spec.gap,
      posterH: availH / rows - spec.gap,
    };
  }
  // Cap posters so they fit a 2:3, but allow taller cells (CSS will object-fit cover).
  const cellW = best.posterW;
  const cellH = Math.min(best.posterH, cellW * 1.5);
  return {
    ...spec,
    cols: best.cols,
    posterW: Math.floor(cellW),
    posterH: Math.floor(cellH),
    rankFont: Math.max(10, Math.floor(cellW * 0.3)),
  };
}

function posterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  // w185 is the smallest TMDB tier that still looks crisp at our cell sizes
  return `https://image.tmdb.org/t/p/w185${posterPath}`;
}

interface RenderOpts {
  size: ShareSize;
  listId: ListId;
  watchedSlugs: string[];
  username: string;
}

export function renderShareImage({
  size,
  listId,
  watchedSlugs,
  username,
}: RenderOpts): Response {
  const list = LISTS[listId];
  const entries = list.entries;
  const watchedSet = new Set(watchedSlugs);
  const watchedInList = entries.filter((e) => watchedSet.has(e.letterboxdSlug)).length;
  const spec = computeGrid(BASE[size], entries.length);

  return new ImageResponse(
    (
      <div
        style={{
          width: spec.w,
          height: spec.h,
          display: "flex",
          flexDirection: "column",
          background: "#0b0b0f",
          color: "#f5f5f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Header
          username={username}
          listTitle={list.title}
          watched={watchedInList}
          total={entries.length}
          spec={spec}
        />
        <Grid entries={entries} watchedSet={watchedSet} spec={spec} />
        <Brand spec={spec} />
      </div>
    ),
    { width: spec.w, height: spec.h },
  );
}

function Header({
  username,
  listTitle,
  watched,
  total,
  spec,
}: {
  username: string;
  listTitle: string;
  watched: number;
  total: number;
  spec: SizeSpec;
}) {
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);
  return (
    <div
      style={{
        height: spec.headerH,
        padding: `0 ${spec.padX}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        borderBottom: "1px solid rgba(212,175,55,0.25)",
      }}
    >
      <div
        style={{
          fontSize: spec.titleFont,
          fontWeight: 600,
          color: "#d4af37",
          display: "flex",
        }}
      >
        <span style={{ color: "#f5f5f7" }}>{username}</span>
        <span style={{ color: "#555", margin: "0 12px" }}>·</span>
        <span>{listTitle}</span>
      </div>
      <div
        style={{
          fontSize: spec.statFont,
          fontWeight: 800,
          color: "#d4af37",
          lineHeight: 1,
          display: "flex",
          alignItems: "baseline",
          gap: 18,
        }}
      >
        <span>
          {watched}
          <span style={{ color: "#555", fontWeight: 600 }}> / {total}</span>
        </span>
        <span style={{ fontSize: spec.statFont * 0.45, color: "#888", fontWeight: 600 }}>
          {pct}% watched
        </span>
      </div>
    </div>
  );
}

function Grid({
  entries,
  watchedSet,
  spec,
}: {
  entries: FilmEntry[];
  watchedSet: Set<string>;
  spec: SizeSpec;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: `${spec.gap * 4}px ${spec.padX}px`,
        display: "flex",
        flexWrap: "wrap",
        gap: spec.gap,
        alignContent: "flex-start",
      }}
    >
      {entries.map((entry) => {
        const watched = watchedSet.has(entry.letterboxdSlug);
        const url = posterUrl(entry.posterPath);
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
              boxShadow: watched
                ? "inset 0 0 0 1px rgba(212,175,55,0.4)"
                : "none",
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
                  filter: watched ? "none" : "grayscale(100%) brightness(0.45)",
                  opacity: watched ? 1 : 0.5,
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
                  color: watched ? "#666" : "#444",
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

function Brand({ spec }: { spec: SizeSpec }) {
  return (
    <div
      style={{
        padding: `12px ${spec.padX}px 18px`,
        fontSize: spec.brandFont,
        color: "#888",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>{SITE_URL}</span>
      <span style={{ color: "#d4af37" }}>scratch-off</span>
    </div>
  );
}
