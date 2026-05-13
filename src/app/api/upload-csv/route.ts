import { NextResponse } from "next/server";
import { parseWatchedCsv, buildListLookup } from "@/lib/csv";
import { mergeSlugs, normalizeUsername } from "@/lib/user";
import { letterboxdUserExists } from "@/lib/letterboxd";
import { LISTS } from "@/lib/lists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const form = await req.formData();
  const rawUsername = form.get("username");
  const file = form.get("file");

  if (typeof rawUsername !== "string" || !rawUsername) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (>5 MB)" }, { status: 413 });
  }

  const username = normalizeUsername(rawUsername);
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }
  if (!(await letterboxdUserExists(username))) {
    return NextResponse.json({ error: "Letterboxd user not found" }, { status: 404 });
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "could not read file" }, { status: 400 });
  }

  const lookup = buildListLookup([
    LISTS["imdb-top-100"].entries,
    LISTS["letterboxd-top-500"].entries,
  ]);

  let parsed;
  try {
    parsed = parseWatchedCsv(text, lookup);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "parse failed" },
      { status: 400 },
    );
  }

  if (parsed.totalRows === 0) {
    return NextResponse.json(
      { error: "no rows found in CSV — is this watched.csv?" },
      { status: 400 },
    );
  }

  const user = await mergeSlugs(
    username,
    parsed.matchedSlugs,
    "csv",
    parsed.totalRows,
  );
  return NextResponse.json({
    username: user.username,
    matchedFromLists: parsed.matchedSlugs.length,
    totalWatched: parsed.totalRows,
    csvUploadedAt: user.csvUploadedAt,
  });
}
