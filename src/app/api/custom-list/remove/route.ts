import { NextResponse } from "next/server";
import { normalizeUsername } from "@/lib/user";
import { removeCustomListFromUser } from "@/lib/custom-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { username?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const username = normalizeUsername(body.username ?? "");
  const id = (body.id ?? "").trim();
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }
  if (!/^[0-9a-f]{16}$/.test(id)) {
    return NextResponse.json({ error: "invalid list id" }, { status: 400 });
  }

  await removeCustomListFromUser(username, id);
  return NextResponse.json({ ok: true });
}
