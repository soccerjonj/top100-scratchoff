import { NextResponse } from "next/server";
import { ensureGuestUser, normalizeUsername, getUser } from "@/lib/user";
import { letterboxdUserExists } from "@/lib/letterboxd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? "");
  if (!/^[a-z0-9_-]{1,40}$/.test(username)) {
    return NextResponse.json(
      { error: "letters, numbers, _ and - only (1-40 chars)" },
      { status: 400 },
    );
  }

  // Refuse if the name already belongs to a non-guest record in our DB
  // (we previously scraped a real Letterboxd profile by that name).
  const existing = await getUser(username);
  if (existing && !existing.isGuest) {
    return NextResponse.json(
      { error: "that name is already a Letterboxd account on the site — pick another" },
      { status: 409 },
    );
  }

  // Also refuse if the nickname currently matches a real public Letterboxd
  // account, even if we haven't scraped it yet. Prevents future collision
  // when the actual owner shows up via /setup. Letterboxd HEAD is fast and
  // best-effort — if it fails we still allow (rare and recoverable via
  // /setup's takeover flow).
  try {
    const conflict = await letterboxdUserExists(username);
    if (conflict) {
      return NextResponse.json(
        {
          error:
            "that name belongs to a real Letterboxd account. Pick a different nickname (e.g. add a number or suffix).",
        },
        { status: 409 },
      );
    }
  } catch {
    // Letterboxd unreachable — proceed with signup; /setup handles
    // collisions if they materialise later.
  }

  const user = await ensureGuestUser(username);
  return NextResponse.json({
    username: user.username,
    isGuest: user.isGuest === true,
    path: `/u/${user.username}`,
  });
}
