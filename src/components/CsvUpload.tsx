"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function CsvUpload({
  username,
  hasCsv,
}: {
  username: string;
  hasCsv: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
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
        setOkMsg(`Imported ${json.filmCount} films.`);
        router.refresh();
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
      className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-sm"
    >
      <div className="text-zinc-400">
        Letterboxd blocks server-side pagination, so we can only see your last{" "}
        ~72 films via scraping. To backfill your full history:
        <ol className="ml-5 mt-2 list-decimal text-xs text-zinc-500">
          <li>
            Open{" "}
            <a
              href="https://letterboxd.com/settings/data/"
              target="_blank"
              rel="noreferrer"
              className="text-gold underline"
            >
              Letterboxd → Settings → Import &amp; Export
            </a>
          </li>
          <li>Click <em>Export Your Data</em>, download the zip</li>
          <li>Unzip and upload <code>watched.csv</code> below</li>
        </ol>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="text-xs file:mr-2 file:rounded file:border-0 file:bg-gold file:px-2 file:py-1 file:text-black"
      />
      {error && <div className="text-xs text-red-400">{error}</div>}
      {okMsg && <div className="text-xs text-green-400">{okMsg}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gold px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
