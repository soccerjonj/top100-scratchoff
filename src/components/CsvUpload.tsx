"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function CsvUpload({
  username,
  hasCsv,
  variant = "collapsed",
  redirectTo,
}: {
  username: string;
  hasCsv: boolean;
  /**
   * "collapsed" (default): starts as a small button, expands the form on click.
   * "expanded": form is rendered inline immediately (for onboarding pages
   * where uploading is the whole point).
   */
  variant?: "collapsed" | "expanded";
  /** Path to navigate to after a successful upload. Defaults to refresh. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(variant === "expanded");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Pick your watched.csv first.");
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const fd = new FormData();
    fd.append("username", username);
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload-csv", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "upload failed");
      } else {
        setOkMsg(`Imported ${json.totalWatched ?? json.filmCount} films.`);
        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        } else {
          router.refresh();
        }
      }
    } catch {
      setError("upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "rounded-md border px-3 py-1.5 text-xs transition",
          hasCsv
            ? "border-zinc-700 text-zinc-400 hover:border-gold/50 hover:text-gold/80"
            : "border-gold bg-gold/10 text-gold hover:bg-gold/20",
        ].join(" ")}
      >
        {hasCsv ? "Re-upload watched.csv" : "Upload watched.csv for full history"}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm"
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="text-xs file:mr-2 file:rounded file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
      />
      {error && <div className="text-xs text-red-400">{error}</div>}
      {okMsg && <div className="text-xs text-green-400">{okMsg}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-dim disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import watched.csv"}
        </button>
        {variant === "collapsed" && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-400"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
