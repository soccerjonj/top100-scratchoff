"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a remote image with an animated progress overlay so users don't
 * wonder if the page is broken while next/og renders the share image
 * (10-30s cold, faster on cached). The percent is estimated: an ease-out
 * curve animates to ~95% over ~14s, then holds. When the <img> fires its
 * `load` event we jump to 100% and fade out the overlay.
 *
 * For images that are already CDN-cached (subsequent visits in the
 * 5-minute window), `load` fires almost instantly and the overlay is
 * gone before the user notices it.
 */
export function PreviewWithProgress({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [pct, setPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If the image is already cached, the browser may have fired `load`
    // before this effect mounts. Check `.complete` once on mount.
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      handleLoad();
      return;
    }

    // Asymptotic curve: percent = 99 * (1 - exp(-t / tau)). Unlike the
    // previous ease-out-then-plateau approach, this never stops moving
    // — it just creeps slower and slower past 90%, so a render that
    // takes 30-60s still shows visible progress all the way through.
    //
    // tau=9s shape (matches typical 15-30s real renders):
    //   t=5s  → 43%
    //   t=10s → 67%
    //   t=15s → 81%
    //   t=20s → 89%
    //   t=30s → 96%
    //   t=45s → 98%
    //   t=60s → 99%
    const startedAt = performance.now();
    const TAU = 9_000;
    const CAP = 99;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const pct = CAP * (1 - Math.exp(-elapsed / TAU));
      setPct(pct);
    };
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function handleLoad() {
    setPct(100);
    setLoaded(true);
    // Brief delay before hiding so the user can register the 100% state.
    window.setTimeout(() => setHidden(true), 500);
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        className={className}
      />
      {!hidden && (
        <div
          className={[
            "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 backdrop-blur-sm transition-opacity duration-500",
            loaded ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <div className="text-center text-xs uppercase tracking-widest text-zinc-500">
            Generating your scratch-off
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gold transition-[width] duration-200 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs font-semibold tabular-nums text-gold">
            {Math.round(pct)}%
          </div>
          {pct >= 88 && !loaded && (
            <div className="text-[10px] text-zinc-600">
              Almost there — high-res posters take a moment
            </div>
          )}
        </div>
      )}
    </div>
  );
}
