"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY_USER = "top100:lastUsername";
const KEY_PARTNER = "top100:lastPartner";

/**
 * Reads localStorage on mount and offers a one-tap "Continue as..."
 * shortcut for returning users. Rendered above the main username form
 * on the landing page. SSR-safe — it only mounts on the client so the
 * SSR HTML never knows about the user's last identity.
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

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
      <div className="text-xs uppercase tracking-widest text-zinc-500">
        Welcome back
      </div>
      <button
        type="button"
        onClick={() => router.push(`/u/${lastUser}`)}
        className="rounded-md bg-gold px-4 py-3 text-left font-semibold text-black hover:bg-gold-dim"
      >
        Continue as{" "}
        <span className="font-bold">{lastUser}</span> →
      </button>
      {lastPartner && lastPartner !== lastUser && (
        <button
          type="button"
          onClick={() =>
            router.push(`/together/${lastUser}/${lastPartner}`)
          }
          className="rounded-md border border-gold px-4 py-2.5 text-left text-sm text-gold hover:bg-gold/10"
        >
          Or with <span className="font-semibold">{lastPartner}</span> →
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
