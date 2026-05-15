"use client";

import { useRef, useState, type FormEvent } from "react";

export function AddCustomListButton({ username }: { username: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function open() {
    setError(null);
    setStatus(null);
    setUrl("");
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Paste a Letterboxd list URL");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Scraping the list — this may take 10-30 seconds…");
    try {
      const res = await fetch("/api/custom-list/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to add list");
        setStatus(null);
        setBusy(false);
        return;
      }
      setStatus(`✓ Imported "${json.title}" (${json.count} films)`);
      window.setTimeout(() => {
        // Hard nav so the server re-renders with the new tab.
        window.location.assign(`/u/${username}?list=${json.id}`);
      }, 600);
    } catch {
      setError("Network error. Try again?");
      setStatus(null);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="shrink-0 rounded-full border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 transition hover:border-gold hover:text-gold sm:px-4 sm:text-sm"
      >
        + Add a list
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto w-[min(480px,calc(100vw-1rem))] rounded-xl border border-zinc-800 bg-zinc-950 p-0 text-foreground shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold">Add a Letterboxd list</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Paste any public Letterboxd list URL — we&apos;ll scrape it and
              add it as a tab on your profile. Limit 10 custom lists, up to
              250 films each.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-zinc-500">
            List URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="letterboxd.com/dave/list/best-of-1999/"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm normal-case tracking-normal text-foreground placeholder:text-zinc-600 focus:border-gold focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          {status && (
            <p className="rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">
              {status}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !url}
              className="flex-1 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-dim disabled:opacity-50"
            >
              {busy ? "Importing…" : "Add list"}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-zinc-600">
            Tip: any list at <code>letterboxd.com/&lt;user&gt;/list/&lt;name&gt;/</code> works
            — Letterboxd&apos;s official lists, friends&apos; lists, awards rosters,
            anything public.
          </p>
        </form>
      </dialog>
    </>
  );
}
