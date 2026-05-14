"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClaimGuestButton({ username }: { username: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClaim() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/claim-guest/${username}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "claim failed");
      }
      // Force a hard navigation so the new (now real-user) record is picked
      // up fresh — router.refresh() alone caches the old getOrRefreshUser
      // result in some Next.js cases.
      window.location.assign(`/u/${username}`);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "claim failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClaim}
        disabled={state === "loading"}
        className="rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-black hover:bg-gold-dim disabled:opacity-50"
      >
        {state === "loading"
          ? "Claiming…"
          : `Yes, that's me — claim ${username}`}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
