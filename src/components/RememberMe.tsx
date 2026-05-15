"use client";

import { useEffect } from "react";

const KEY_USER = "top100:lastUsername";
const KEY_PARTNER = "top100:lastPartner";

/**
 * Mounts on /u/[username] and /together pages to remember the current
 * identity in localStorage so the landing page can offer a one-tap
 * "Continue as ..." shortcut on the next visit.
 *
 * Single-user mode: just stores the username.
 * Together mode: stores the first username as "you" and the second as
 * the most-recent partner. The landing page reads both for the "Open
 * yours" + "Open with partner" buttons.
 */
export function RememberMe({
  username,
  partner,
}: {
  username: string;
  /** Other user when on /together. */
  partner?: string;
}) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY_USER, username);
      if (partner) {
        localStorage.setItem(KEY_PARTNER, partner);
      }
    } catch {
      // Private browsing / quota error — silently ignore.
    }
  }, [username, partner]);

  return null;
}

export const REMEMBER_KEYS = { KEY_USER, KEY_PARTNER };
