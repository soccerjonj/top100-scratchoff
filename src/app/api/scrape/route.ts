import { NextResponse } from "next/server";
import { refreshUserFromScrape, normalizeUsername } from "@/lib/user";
import { LetterboxdNotFoundError } from "@/lib/letterboxd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const username =
    typeof body === "object" && body && "username" in body
      ? String((body as { username: unknown }).username ?? "")
      : "";

  const clean = normalizeUsername(username);
  if (!/^[a-z0-9_-]+$/.test(clean)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }

  try {
    const user = await refreshUserFromScrape(clean);
    return NextResponse.json({
      username: user.username,
      filmCount: user.filmCount,
      lastScrapedAt: user.lastScrapedAt,
    });
  } catch (e) {
    if (e instanceof LetterboxdNotFoundError) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    console.error("scrape failed", e);
    return NextResponse.json({ error: "scrape failed" }, { status: 500 });
  }
}
