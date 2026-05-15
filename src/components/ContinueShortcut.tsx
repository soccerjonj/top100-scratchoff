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
    <div className="flex w-full max-w-sm flex-col gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
      <div className="text-xs uppercase tracking-widest text-zinc-500">
        Welcome back
      </div>
      {hasPartner ? (
        <>
          <button
            type="button"
            onClick={() =>
              router.push(`/together/${lastUser}/${lastPartner}`)
            }
            className="continue-pulse rounded-md bg-gold px-4 py-3 text-left font-semibold text-black transition hover:bg-gold-dim"
          >
            Open with{" "}
            <span className="font-bold">
              {lastUser} × {lastPartner}
            </span>{" "}
            →
          </button>
          <button
            type="button"
            onClick={() => router.push(`/u/${lastUser}`)}
            className="rounded-md border border-gold px-4 py-2.5 text-left text-sm text-gold hover:bg-gold/10"
          >
            Or just view <span className="font-semibold">{lastUser}</span> →
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => router.push(`/u/${lastUser}`)}
          className="continue-pulse rounded-md bg-gold px-4 py-3 text-left font-semibold text-black transition hover:bg-gold-dim"
        >
          Continue as <span className="font-bold">{lastUser}</span> →
        </button>
      )}
      <button
        type="button"
        onClick={forget}
        className="self-end text-[10px] text-zinc-600 hover:text-zinc-400"
      >
        Forget me
      </button>
    </div>
  );
}
