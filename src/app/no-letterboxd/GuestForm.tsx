"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function GuestForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const username = normalize(value);
    if (!username) {
      setError("Pick a nickname");
      return;
    }
    if (!/^[a-z0-9_-]{1,40}$/.test(username)) {
      setError("Letters, numbers, _ and - only (max 40 chars)");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "couldn't create profile");
        setLoading(false);
        return;
      }
      router.push(json.path);
    } catch {
      setError("network error");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3"
    >
      <label className="text-xs uppercase tracking-wider text-zinc-500">
        Pick a nickname
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. movie-fan-42"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-foreground placeholder:text-zinc-600 focus:border-gold focus:outline-none"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !value}
        className="rounded-lg bg-gold px-4 py-3 font-semibold text-black transition hover:bg-gold-dim disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating…" : "Start tracking →"}
      </button>
      <p className="text-xs text-zinc-600">
        Your nickname becomes the URL you bookmark
        (top100scratchoff.com/u/<span className="text-zinc-400">your-nickname</span>).
        Share it with friends or keep it private.
      </p>
    </form>
  );
}
