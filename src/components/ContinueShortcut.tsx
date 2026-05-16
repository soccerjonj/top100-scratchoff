"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY_USER = "top100:lastUsername";
const KEY_PARTNER = "top100:lastPartner";

/**
 * Reads localStorage on mount and offers one-tap "Continue" shortcuts
 * for returning users. SSR-safe — only renders after the client effect
 * fires, so first-time visitors see the standard form unchanged.
 *
 * Priority hierarchy when both user + partner are saved:
 *   1. Open with [partner] (gold filled, primary — the "main" view)
 *   2. Just view yourself (gold outlined, secondary)
 *
 * Rationale: if you've ever used /together, it's almost certainly
 * because the shared view is your default mental model. Make it the
 * one tap, not two.
 */
export function ContinueShortcut() {
  const router = useRouter();
  const [lastUser, setLastUser] = useState<string | null>(null);
  const [lastPartner, setLastPartner] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem(KEY_USER);
      const p = localStorage.getItem(KEY_PARTNER);
      if (u) setLastUser(u);
      if (p) setLastPartner(p);
    } catch {
      // SecurityError in some embedded contexts — ignore.
    }
  }, []);

  if (!lastUser) return null;

  function forget() {
    try {
      localStorage.removeItem(KEY_USER);
      localStorage.removeItem(KEY_PARTNER);
    } catch {}
    setLastUser(null);
    setLastPartner(null);
  }

  const hasPartner = lastPartner && lastPartner !== lastUser;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2.5">
      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">
        Welcome back
      </div>
      <button
        type="button"
        onClick={() =>
          hasPartner
            ? router.push(`/together/${lastUser}/${lastPartner}`)
            : router.push(`/u/${lastUser}`)
        }
        className="w-full rounded-lg bg-gold px-4 py-3 text-center font-semibold text-black transition hover:bg-gold-dim"
      >
        Continue as{" "}
        <span className="font-bold">
          {hasPartner ? `${lastUser} × ${lastPartner}` : lastUser}
        </span>{" "}
        →
      </button>
      {hasPartner && (
        <button
          type="button"
          onClick={() => router.push(`/u/${lastUser}`)}
          className="text-sm text-zinc-500 underline-offset-2 transition hover:text-gold hover:underline"
        >
          or just view {lastUser}
        </button>
      )}
      <button
        type="button"
        onClick={forget}
        className="text-[10px] uppercase tracking-wider text-zinc-700 transition hover:text-zinc-500"
      >
        Not you? Forget me
      </button>
    </div>
  );
}
