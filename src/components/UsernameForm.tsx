"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function UsernameForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const names = value
      .split(/[\s,]+/)
      .map(normalize)
      .filter(Boolean);
    if (names.length === 0) {
      setError("Enter at least one username");
      return;
    }
    for (const n of names) {
      if (!/^[a-z0-9_-]+$/.test(n)) {
        setError(`"${n}" — letters, numbers, _ and - only`);
        return;
      }
    }
    setError(null);
    setLoading(true);
    if (names.length === 1) {
      router.push(`/u/${names[0]}`);
    } else {
      router.push(`/together/${names.join("/")}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-center overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-gold">
        <span className="px-3 text-zinc-500">letterboxd.com/</span>
        <input
          type="text"
          name="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent py-3 pr-3 text-foreground placeholder:text-zinc-600 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !value}
        className="rounded-lg bg-gold px-4 py-3 font-semibold text-black transition hover:bg-gold-dim disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Scratching…" : "Reveal"}
      </button>
      <p className="text-xs text-zinc-600">
        Enter two usernames (e.g. <code>alice, bob</code>) to see what you&apos;ve
        both watched.
      </p>
    </form>
  );
}
