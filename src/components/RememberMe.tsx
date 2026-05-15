"use client";

import { useEffect } from "react";

const KEY_USER = "top100:lastUsername";
const KEY_PARTNER = "top100:lastPartner";
const KEY_RECENT_GROUPS = "top100:recentGroups";
const MAX_RECENT_GROUPS = 6;

/**
 * Mounts on /u/[username] and /together pages to remember the current
 * identity in localStorage so the landing page can offer a one-tap
 * "Continue as ..." shortcut on the next visit, and the user page can
 * surface recent groups for one-tap recall.
 *
 * Single-user mode: just stores the username.
 * Together mode: stores the first username as "you", the second as
 * the most-recent partner (backwards-compat), and pushes the full
 * group (deduped, length 2+) to a recent-groups history list.
 */
export function RememberMe({
  username,
  partner,
  group,
}: {
  username: string;
  /** Other user when on /together. */
  partner?: string;
  /** Full group (usernames[]) when on /together — including self. Length 2+. */
  group?: string[];
}) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY_USER, username);
      if (partner) {
        localStorage.setItem(KEY_PARTNER, partner);
      }
      if (group && group.length >= 2) {
        const incoming = canonicalGroup(group);
        const raw = localStorage.getItem(KEY_RECENT_GROUPS);
        const existing: string[][] = raw
          ? safeParseGroups(raw)
          : [];
        const filtered = existing.filter(
          (g) => canonicalGroup(g).join("|") !== incoming.join("|"),
        );
        const next = [incoming, ...filtered].slice(0, MAX_RECENT_GROUPS);
        localStorage.setItem(KEY_RECENT_GROUPS, JSON.stringify(next));
      }
    } catch {
      // Private browsing / quota error — silently ignore.
    }
  }, [username, partner, group]);

  return null;
}

/** Canonical comparison form: lowercase + sorted. */
function canonicalGroup(group: string[]): string[] {
  return [...group.map((u) => u.toLowerCase())].sort();
}

function safeParseGroups(raw: string): string[][] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (g): g is string[] =>
        Array.isArray(g) && g.every((s) => typeof s === "string"),
    );
  } catch {
    return [];
  }
}

export const REMEMBER_KEYS = {
  KEY_USER,
  KEY_PARTNER,
  KEY_RECENT_GROUPS,
};
