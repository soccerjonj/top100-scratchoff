"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

const MILESTONES = [25, 50, 75, 100] as const;

export function ProgressBar({
  watched,
  total,
}: {
  watched: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);
  const reduceMotion = useReducedMotion();

  // Smoothly animate the displayed numbers when `watched` changes.
  const watchedMV = useMotionValue(watched);
  const pctMV = useMotionValue(pct);
  const watchedDisplay = useTransform(watchedMV, (v) => Math.round(v));
  const pctDisplay = useTransform(pctMV, (v) => Math.round(v));

  // Force <motion.span>'s textContent to update on every frame via
  // useState — useTransform alone won't re-render React text nodes.
  const [watchedText, setWatchedText] = useState(watched);
  const [pctText, setPctText] = useState(pct);

  useEffect(() => {
    const unsubW = watchedDisplay.on("change", (v) => setWatchedText(v));
    const unsubP = pctDisplay.on("change", (v) => setPctText(v));
    return () => {
      unsubW();
      unsubP();
    };
  }, [watchedDisplay, pctDisplay]);

  useEffect(() => {
    if (reduceMotion) {
      watchedMV.set(watched);
      pctMV.set(pct);
      setWatchedText(watched);
      setPctText(pct);
      return;
    }
    const c1 = animate(watchedMV, watched, { duration: 0.65, ease: "easeOut" });
    const c2 = animate(pctMV, pct, { duration: 0.65, ease: "easeOut" });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [watched, pct, watchedMV, pctMV, reduceMotion]);

  // Flash the numbers when a milestone is crossed (25/50/75/100).
  const prevPctRef = useRef(pct);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    const prev = prevPctRef.current;
    const crossed = MILESTONES.some((m) => prev < m && pct >= m);
    if (crossed && !reduceMotion) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 750);
      prevPctRef.current = pct;
      return () => clearTimeout(t);
    }
    prevPctRef.current = pct;
  }, [pct, reduceMotion]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="relative h-full overflow-hidden rounded-full bg-gold transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        >
          {/* Continuous sheen sweep inside the filled portion */}
          {pct > 0 && <span className="progress-shimmer" aria-hidden />}
        </div>
      </div>
      <div className={`text-sm tabular-nums ${flashing ? "progress-flash" : ""}`}>
        <motion.span className="text-gold font-semibold">
          {watchedText}
        </motion.span>
        <span className="text-zinc-500"> / {total}</span>
        <span className="ml-2 text-zinc-500">
          {pct >= 100 ? (
            <span className="text-gold" aria-label="100 percent">🏆</span>
          ) : (
            <>(<motion.span>{pctText}</motion.span>%)</>
          )}
        </span>
      </div>
    </div>
  );
}
