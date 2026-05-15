"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

export function CsvUpload({
  username,
  hasCsv,
  variant = "collapsed",
  redirectTo,
}: {
  username: string;
  hasCsv: boolean;
  variant?: "collapsed" | "expanded";
  redirectTo?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(variant === "expanded");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "success">("idle");
  const [imported, setImported] = useState<number | null>(null);
  // Tick a friendly status message every ~1.5s while uploading.
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (stage !== "uploading") return;
    const id = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % 3);
    }, 1500);
    return () => window.clearInterval(id);
  }, [stage]);

  async function runUpload(file: File) {
    setError(null);
    setStage("uploading");
    setBusy(true);
    setStepIdx(0);
    const fd = new FormData();
    fd.append("username", username);
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload-csv", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed. Try again?");
        setStage("idle");
        setBusy(false);
        return;
      }
      setImported(json.totalWatched ?? json.filmCount ?? null);
      setStage("success");
      // Brief moment so the user registers the success state, then
      // hard-navigate. window.location.assign() avoids client-router
      // caching weirdness — the new page renders cleanly from scratch.
      window.setTimeout(() => {
        if (redirectTo) {
          window.location.assign(redirectTo);
        } else {
          router.refresh();
          setBusy(false);
        }
      }, 800);
    } catch {
      setError("Network error. Try again?");
      setStage("idle");
      setBusy(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) runUpload(file);
  }

  // Manual submit fallback (e.g. if the user re-tries after an error)
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Pick your watched.csv first.");
      return;
    }
    runUpload(file);
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

  if (stage === "uploading") {
    return <UploadingState stepIdx={stepIdx} />;
  }

  if (stage === "success") {
    return (
      <div className="rounded-md border border-gold/40 bg-gold/10 p-4 text-sm">
        <div className="font-semibold text-gold">
          ✓ Imported {imported?.toLocaleString() ?? ""} films
        </div>
        <div className="mt-1 text-xs text-zinc-400">Loading your grid…</div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm"
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 px-6 py-8 text-center transition hover:border-gold hover:bg-gold/5">
        <div className="text-3xl">📁</div>
        <div className="text-sm font-semibold text-foreground">
          Choose your <code className="text-gold">watched.csv</code>
        </div>
        <div className="text-xs text-zinc-500">
          We&apos;ll start importing the moment you pick the file.
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={busy}
          className="sr-only"
        />
      </label>
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      {variant === "collapsed" && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="self-start rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

const STEPS = [
  "Reading your watched.csv…",
  "Matching films across the four lists…",
  "Almost done — preparing your grid…",
];

function UploadingState({ stepIdx }: { stepIdx: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-3">
        <Spinner />
        <div className="text-sm font-semibold text-foreground">
          Importing your history
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="indeterminate-bar h-full w-1/3 bg-gold" />
      </div>
      <div className="text-xs text-zinc-400">{STEPS[stepIdx]}</div>
      <div className="text-[10px] text-zinc-600">
        Usually takes 2-5 seconds. Don&apos;t refresh.
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-gold"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
