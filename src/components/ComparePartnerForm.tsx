"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";

/**
 * Multi-user "compare" form. Accepts one or more usernames as chips and
 * navigates to /together/[self]/[name1]/[name2]/...
 *
 * UX: type a username, press Enter or comma to add as a chip. Press
 * Backspace in an empty input to remove the last chip. Submit (or press
 * Enter when the input is empty and at least one chip exists) navigates.
 */
export function ComparePartnerForm({ self }: { self: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function tryAddChip(raw: string): boolean {
    const p = raw.trim().toLowerCase().replace(/^@/, "");
    if (!p) return false;
    if (!/^[a-z0-9_-]+$/.test(p)) {
      setError(`"${raw}" — letters, numbers, _ and - only`);
      return false;
    }
    if (p === self) {
      setError("that's you");
      return false;
    }
    if (chips.includes(p)) {
      setError(`${p} is already in the group`);
      return false;
    }
    setError(null);
    setChips((prev) => [...prev, p]);
    return true;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      // Enter on empty input + has chips → submit. Otherwise commit chip.
      if (draft.trim()) {
        e.preventDefault();
        if (tryAddChip(draft)) setDraft("");
      } else if (e.key === "Enter" && chips.length > 0) {
        // Let the form's submit handler run normally.
      }
    } else if (e.key === "Backspace" && !draft && chips.length > 0) {
      // Remove the last chip on backspace from empty input.
      setChips((prev) => prev.slice(0, -1));
      setError(null);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Auto-commit any pending draft text before navigating.
    let finalChips = chips;
    if (draft.trim()) {
      const p = draft.trim().toLowerCase().replace(/^@/, "");
      if (!/^[a-z0-9_-]+$/.test(p)) {
        setError(`"${draft.trim()}" — letters, numbers, _ and - only`);
        return;
      }
      if (p === self) {
        setError("that's you");
        return;
      }
      if (!chips.includes(p)) {
        finalChips = [...chips, p];
      }
    }
    if (finalChips.length === 0) {
      setError("add at least one username");
      return;
    }
    setError(null);
    router.push(`/together/${self}/${finalChips.join("/")}`);
  }

  function removeChip(name: string) {
    setChips((prev) => prev.filter((c) => c !== name));
    setError(null);
  }

  const cta =
    chips.length === 0
      ? "Compare"
      : chips.length === 1
        ? `Open with ${chips[0]}`
        : `Open group of ${chips.length + 1}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 text-sm"
      aria-label="Compare with partner or group"
    >
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 focus-within:border-gold">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {self}
        </span>
        {chips.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold"
          >
            {c}
            <button
              type="button"
              onClick={() => removeChip(c)}
              aria-label={`Remove ${c}`}
              className="text-gold/60 transition hover:text-gold"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            chips.length === 0
              ? "add a partner — enter to confirm"
              : "+ add another"
          }
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-[8rem] flex-1 bg-transparent text-foreground placeholder:text-zinc-600 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="submit"
          disabled={chips.length === 0 && !draft.trim()}
          className="rounded-md bg-gold px-3 py-1.5 font-semibold text-black transition hover:bg-gold-dim disabled:opacity-50"
        >
          {cta} →
        </button>
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : (
          <span className="text-zinc-600">
            Press <kbd className="rounded border border-zinc-700 px-1">Enter</kbd> or{" "}
            <kbd className="rounded border border-zinc-700 px-1">,</kbd> to add another.
          </span>
        )}
      </div>
    </form>
  );
}
