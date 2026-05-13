import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongo";
import { refreshUserFromScrape } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SPACING_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const col = await getUsersCollection();
  const users = await col
    .find({}, { projection: { username: 1, lastScrapedAt: 1 } })
    .sort({ lastScrapedAt: 1 })
    .toArray();

  const results: Array<{ username: string; ok: boolean; error?: string }> = [];
  for (const u of users) {
    try {
      await refreshUserFromScrape(u.username);
      results.push({ username: u.username, ok: true });
    } catch (e) {
      results.push({
        username: u.username,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    await sleep(SPACING_MS);
  }

  return NextResponse.json({
    refreshed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
