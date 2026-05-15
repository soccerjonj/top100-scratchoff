"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShareIcon } from "./ShareIcon";

const BUILT_IN: ReadonlySet<string> = new Set([
  "imdb-top-100",
  "afi-top-100",
  "nyt-top-100",
  "letterboxd-top-500",
]);

/**
 * Reactive Share button — keeps its href in sync with the active list
 * even as the user clicks between tabs on the client (which only
 * updates the URL via history.replaceState, bypassing Next's router).
 *
 * ListSwitcher dispatches a "top100:listchange" CustomEvent whenever
 * it activates a new list. We listen for that + popstate to stay in
 * sync.
 *
 * Custom lists don't have a share image flow yet, so when one is
 * active we fall back to the user's IMDB Top 100 share page (still
 * a valid share — just for a different list).
 */
export function ShareButton({
  username,
  initialList,
}: {
  username: string;
  initialList: string;
}) {
  const [list, setList] = useState(initialList);

  useEffect(() => {
    function syncFromUrl() {
      try {
        const params = new URLSearchParams(window.location.search);
        const next = params.get("list") ?? initialList;
        setList(next);
      } catch {
        // ignore
      }
    }
    function onListChange(e: Event) {
      const detail = (e as CustomEvent<{ id?: string }>).detail;
      if (detail?.id) setList(detail.id);
    }
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("top100:listchange", onListChange);
    // Initial sync in case the URL has a list= the server didn't account
    // for (e.g. a custom-list id from a bookmark).
    syncFromUrl();
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("top100:listchange", onListChange);
    };
  }, [initialList]);

  // Built-in lists → share their own page. Custom lists → fall back to
  // the user's IMDB Top 100 share (we don't have a custom-list share
  // image template yet).
  const shareList = BUILT_IN.has(list) ? list : "imdb-top-100";

  return (
    <Link
      href={`/share/${username}/${shareList}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-black hover:bg-gold-dim sm:px-4"
    >
      <ShareIcon size={15} />
      Share
    </Link>
  );
}
