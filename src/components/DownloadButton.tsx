"use client";

import { useEffect, useState } from "react";

/**
 * Save / share / download an image, picking the best mechanism per
 * platform. The most common flow on mobile is "save to Photos so I can
 * post to Instagram" — but iOS Safari ignores the HTML `<a download>`
 * attribute, and a blob-anchor click on iOS gets you the Files app at
 * best, not Photos. The Web Share API is the only API that reaches
 * Photos in one tap on iOS.
 *
 * Strategy, in order of preference:
 *   1. `navigator.share({ files })` — opens the native share sheet on
 *      iOS/Android. The user picks "Save Image" → Photos, or shares
 *      directly to Instagram/X/WhatsApp/etc. with caption preserved.
 *   2. Blob URL + programmatic anchor click — desktop Chrome/Firefox/
 *      Edge download to the Downloads folder.
 *   3. Open the image in a new tab — last-ditch on browsers without
 *      either of the above (long-press to save still works on mobile).
 *
 * Caller passes the image URL + filename. Optional `shareText` /
 * `shareUrl` are attached to the Web Share API call so the caption is
 * pre-populated when the user shares directly to a social app.
 */
export function DownloadButton({
  href,
  filename,
  shareText,
  shareUrl,
  children,
  className,
}: {
  href: string;
  filename: string;
  /** Caption included in the native share sheet (when supported). */
  shareText?: string;
  /** URL passed alongside the file in the share sheet (when supported). */
  shareUrl?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [canShareFiles, setCanShareFiles] = useState(false);

  // Detect Web Share API file-share capability on mount. iOS Safari 15+,
  // Android Chrome, and most modern mobile browsers support this. Desktop
  // browsers typically don't.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.canShare !== "function") return;
    try {
      const probe = new File([new Blob()], "probe.png", { type: "image/png" });
      if (navigator.canShare({ files: [probe] })) {
        setCanShareFiles(true);
      }
    } catch {
      // Some browsers throw when File constructor isn't available.
      setCanShareFiles(false);
    }
  }, []);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setState("loading");
    try {
      // The share URL has already been preloaded by the parent page,
      // so this fetch normally hits the browser cache (instant).
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      // Path 1: Web Share API — native sheet, includes "Save Image" → Photos.
      if (canShareFiles && navigator.share) {
        const file = new File([blob], filename, {
          type: blob.type || "image/png",
        });
        const shareData: ShareData = { files: [file] };
        if (shareText) shareData.text = shareText;
        if (shareUrl) shareData.url = shareUrl;
        // Re-check with the actual file present — canShare can be picky.
        if (navigator.canShare?.(shareData)) {
          try {
            await navigator.share(shareData);
            setState("idle");
            return;
          } catch (err: unknown) {
            // User dismissed the sheet — not an error.
            const name =
              err && typeof err === "object" && "name" in err
                ? (err as { name?: string }).name
                : undefined;
            if (name === "AbortError") {
              setState("idle");
              return;
            }
            // Anything else: fall through to the download path.
          }
        }
      }

      // Path 2: Blob URL + anchor click — desktop browsers.
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
      // Path 3: Open in a new tab so the user can long-press to save.
      window.open(href, "_blank");
    }
  }

  const label =
    state === "loading"
      ? canShareFiles
        ? "Preparing share…"
        : "Preparing…"
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
