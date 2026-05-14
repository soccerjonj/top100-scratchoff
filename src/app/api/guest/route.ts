import { NextResponse } from "next/server";
import { ensureGuestUser, normalizeUsername, getUser } from "@/lib/user";

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

  // Refuse if the name already belongs to a non-guest record (e.g. a real
  // Letterboxd profile we've previously scraped). The new user needs to
  // pick a different nickname so they don't collide.
  const existing = await getUser(username);
  if (existing && !existing.isGuest) {
    return NextResponse.json(
      { error: "that name is already taken by a Letterboxd account — pick another" },
      { status: 409 },
    );
  }

  const user = await ensureGuestUser(username);
  return NextResponse.json({
    username: user.username,
    isGuest: user.isGuest === true,
    path: `/u/${user.username}`,
  });
}
