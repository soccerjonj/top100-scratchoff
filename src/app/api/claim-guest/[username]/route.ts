import { NextResponse } from "next/server";
import { claimGuestAsLetterboxd, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }

  try {
    const user = await claimGuestAsLetterboxd(username);
    if (!user) {
      return NextResponse.json(
        { error: "no guest record to claim" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      username: user.username,
      filmCount: user.filmCount,
    });
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) {
      return NextResponse.json(
        { error: "no Letterboxd profile at that name" },
        { status: 404 },
      );
    }
    console.error("claim-guest failed", e);
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }
}
