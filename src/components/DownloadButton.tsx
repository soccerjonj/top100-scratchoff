"use client";

import { useState } from "react";

/**
 * Reliable cross-platform download trigger.
 *
 * Mobile Safari (where most IG-story sharing happens) ignores the HTML
 * `<a download>` attribute on same-origin URLs whose response isn't already
 * marked attachment — it just navigates to the image or does nothing
 * visible. Instead, fetch the URL as a blob, create an object URL, and
 * programmatically click an anchor. This works on iOS Safari, Android
 * Chrome, and every desktop browser, and uses the same URL as the preload
 * imgs on the page so the response is typically already in cache.
 */
export function DownloadButton({
  href,
  filename,
  children,
  className,
}: {
  href: string;
  filename: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1500);
      setState("idle");
    } catch (err) {
      console.error("download failed", err);
      setState("error");
      // Fallback: open in new tab. User can long-press to save on mobile.
      window.open(href, "_blank");
    }
  }

  const label =
    state === "loading"
      ? "Preparing…"
      : state === "error"
        ? "Opened in tab — long-press to save"
        : children;

  return (
    <a
      href={href}
      download={filename}
      onClick={handleClick}
      className={className}
    >
      {label}
    </a>
  );
}
