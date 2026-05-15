"use client";

import { useState } from "react";
import { ComparePartnerForm } from "./ComparePartnerForm";
import { RecentGroups } from "./RecentGroups";

/**
 * Prominent panel near the top of /u/[username] that surfaces both:
 *  - one-click recent-group chips (recall flow)
 *  - the multi-username "compare with partner or group" form (add flow)
 *
 * Default state: collapsed to a single button so it doesn't compete with
 * the poster grid. Clicking expands. When recent groups exist, they
 * peek above the collapsed button so the recall flow is always one tap.
 */
export function GroupPanel({ self }: { self: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-4">
      <RecentGroups self={self} className="mb-2" />
      {open ? (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Compare with a partner or group
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <ComparePartnerForm self={self} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-xs font-medium text-gold transition hover:border-gold hover:bg-gold/10 sm:text-sm"
        >
          <span aria-hidden>+</span>
          Compare with a partner or group
        </button>
      )}
    </section>
  );
}
