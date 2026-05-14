"use client";

import { useEffect } from "react";
import { LISTS } from "@/lib/lists";
import type { ListId } from "@/types";

/**
 * Quietly fetches poster images for the *inactive* lists in the
 * background after the main page is interactive. Once the bytes are in
 * the browser cache, switching to that tab paints the posters
 * immediately — no per-poster network round-trip on first activation.
 *
 * Heuristics:
 *  - Wait 1.5s after mount so the active list has bandwidth priority.
 *  - Skip on slow networks (navigator.connection effectiveType === "2g"
 *    or "slow-2g") — would burn data and probably make things worse.
 *  - Letterboxd Top 500 (~500 images) loads last, with smaller batches,
 *    so it doesn't saturate the connection.
 */
export function PosterPreloader({ activeListId }: { activeListId: ListId }) {
  useEffect(() => {
    // Don't aggressively preload on slow networks.
    const conn = (
      navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }
    ).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(slow-)?2g/.test(conn.effectiveType)) return;

    const cancel = { aborted: false };
    const timer = window.setTimeout(() => {
      if (cancel.aborted) return;

      // Order inactive lists with small ones first; the 500-entry list
      // last so it doesn't choke the queue.
      const inactive = (
        ["imdb-top-100", "afi-top-100", "nyt-top-100", "letterboxd-top-500"] as ListId[]
      ).filter((id) => id !== activeListId);

      // Use new Image() so browser fetches go through the standard
      // image cache. Limit concurrency so we don't open too many
      // connections at once (HTTP/2 multiplexes but tcp slow-start is
      // real). 8 in flight is a reasonable mobile sweet spot.
      const urls: string[] = [];
      for (const id of inactive) {
        for (const entry of LISTS[id].entries) {
          if (entry.posterPath) {
            urls.push(`https://image.tmdb.org/t/p/w185${entry.posterPath}`);
          }
        }
      }

      let i = 0;
      const CONCURRENCY = 8;
      let inflight = 0;
      function pump() {
        if (cancel.aborted) return;
        while (inflight < CONCURRENCY && i < urls.length) {
          const url = urls[i++];
          inflight++;
          const img = new Image();
          const done = () => {
            inflight--;
            pump();
          };
          img.onload = done;
          img.onerror = done;
          img.src = url;
        }
      }
      pump();
    }, 1500);

    return () => {
      cancel.aborted = true;
      window.clearTimeout(timer);
    };
  }, [activeListId]);

  return null;
}
