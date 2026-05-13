"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ComparePartnerForm({ self }: { self: string }) {
  const router = useRouter();
  const [partner, setPartner] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const p = partner.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_-]+$/.test(p)) {
      setError("letters, numbers, _ and - only");
      return;
    }
    if (p === self) {
      setError("that's you");
      return;
    }
    setError(null);
    router.push(`/together/${self}/${p}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      <label className="text-zinc-500">Compare with partner:</label>
      <input
        type="text"
        value={partner}
        onChange={(e) => setPartner(e.target.value)}
        placeholder="their username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-foreground placeholder:text-zinc-600 focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={!partner}
        className="rounded bg-gold px-2 py-1 font-semibold text-black disabled:opacity-50"
      >
        Compare
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </form>
  );
}
