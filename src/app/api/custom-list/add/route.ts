import { NextResponse } from "next/server";
import { normalizeUsername, getUser } from "@/lib/user";
import {
  addCustomListToUser,
  TooManyListsError,
} from "@/lib/custom-list";
import {
  InvalidLetterboxdListUrl,
  LetterboxdListNotFound,
} from "@/lib/letterboxd-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { username?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const username = normalizeUsername(body.username ?? "");
  const rawUrl = (body.url ?? "").trim();
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }
  if (!rawUrl) {
    return NextResponse.json(
      { error: "list URL required" },
      { status: 400 },
    );
  }

  const user = await getUser(username);
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  try {
    const list = await addCustomListToUser(username, rawUrl);
    return NextResponse.json({
      id: list.id,
      url: list.url,
      title: list.title,
      count: list.entries.length,
    });
  } catch (e) {
    if (e instanceof InvalidLetterboxdListUrl) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof LetterboxdListNotFound) {
      return NextResponse.json(
        { error: "Couldn't find that Letterboxd list. Is the URL public?" },
        { status: 404 },
      );
    }
    if (e instanceof TooManyListsError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("custom-list/add failed", e);
    return NextResponse.json(
      { error: "Failed to add list. Try again?" },
      { status: 500 },
    );
  }
}
