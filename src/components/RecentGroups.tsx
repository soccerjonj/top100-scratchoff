"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REMEMBER_KEYS } from "./RememberMe";

const { KEY_RECENT_GROUPS } = REMEMBER_KEYS;

/**
 * Reads the recent-groups history from localStorage and renders
 * one-click chips that jump straight into /together/...
 *
 * - On /u/[username]: pass `self` so groups are sorted with `self` first
 *   in the URL (you're always the "host" link). Groups that don't include
 *   self are still shown — handy when you've viewed someone else's group
 *   before.
 * - On the landing page: pass no `self` and the most-recent group fires
 *   exactly as it was stored.
 *
 * Only renders if there's at least one recent group — SSR-safe (returns
 * null on first paint, then hydrates from localStorage).
 */
export function RecentGroups({
  self,
  className,
}: {
  self?: string;
  className?: string;
}) {
  const [groups, setGroups] = useState<string[][] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY_RECENT_GROUPS);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cleaned: string[][] = parsed
        .filter(
          (g: unknown): g is string[] =>
            Array.isArray(g) && g.length >= 2 && g.every((s) => typeof s === "string"),
        )
        .map((g) => Array.from(new Set(g.map((s) => s.toLowerCase()))));
      setGroups(cleaned);
    } catch {
      // ignore
    }
  }, []);

  if (!groups || groups.length === 0) return null;

  return (
    <div className={className}>
      <div className="mb-1.5 text-[10px] uppercase tracking-widest text-zinc-600">
        Recent groups
      </div>
      <div className="flex flex-wrap gap-1.5">
        {groups.map((g, i) => {
          const ordered = self
            ? [self, ...g.filter((u) => u !== self)]
            : g;
          const href = `/together/${ordered.join("/")}`;
          return (
            <Link
              key={`${i}-${ordered.join("|")}`}
              href={href}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-gold hover:bg-gold/10 hover:text-gold"
            >
              <span aria-hidden className="text-zinc-600">↪</span>
              {ordered.join(" × ")}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
