import { NextResponse } from "next/server";
import { setManualWatchedState, normalizeUsername } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }

  let body: { slug?: string; watched?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const slug = body.slug;
  const watched = body.watched;
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }
  if (typeof watched !== "boolean") {
    return NextResponse.json({ error: "invalid watched" }, { status: 400 });
  }

  const user = await setManualWatchedState(username, slug, watched);
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  return NextResponse.json({
    username: user.username,
    manualWatched: user.manualWatched ?? [],
    manualUnwatched: user.manualUnwatched ?? [],
  });
}
