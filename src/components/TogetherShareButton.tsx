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
 * Share button for /together — reactive to the active list + mode.
 * Listens for "top100:listchange" events that TogetherSwitcher
 * dispatches when the user clicks a tab, plus reads ?mode= from the URL
 * which TogetherSwitcher keeps in sync via history.replaceState.
 */
export function TogetherShareButton({
  usernames,
  initialList,
  initialMode,
}: {
  usernames: string[];
  initialList: string;
  initialMode: "both" | "either";
}) {
  const [list, setList] = useState(initialList);
  const [mode, setMode] = useState<"both" | "either">(initialMode);

  useEffect(() => {
    function sync() {
      const params = new URLSearchParams(window.location.search);
      const l = params.get("list") ?? initialList;
      const m = params.get("mode");
      setList(l);
      setMode(m === "either" ? "either" : "both");
    }
    function onListChange(e: Event) {
      const detail = (e as CustomEvent<{ id?: string }>).detail;
      if (detail?.id) setList(detail.id);
    }
    window.addEventListener("popstate", sync);
    window.addEventListener("top100:listchange", onListChange);
    // Poll search params on each tick (TogetherSwitcher updates URL via
    // replaceState which doesn't fire popstate; we want mode changes too)
    const id = window.setInterval(sync, 500);
    sync();
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("top100:listchange", onListChange);
      window.clearInterval(id);
    };
  }, [initialList]);

  const shareList = BUILT_IN.has(list) ? list : "imdb-top-100";
  const href = `/share/together/${usernames.join("/")}/${shareList}${mode === "either" ? "?mode=either" : ""}`;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-black hover:bg-gold-dim sm:px-4"
    >
      <ShareIcon size={15} />
      Share
    </Link>
  );
}
