import { type NextRequest, NextResponse } from "next/server";
import { getSessionUsername } from "@/shared/server/auth";
import { getRedis } from "@/shared/server/redis";
import { ping } from "@/shared/server/stats";

/** Heartbeat from the city: marks you online and returns { total, online }. `{ away: true }` signs off. */
export async function POST(req: NextRequest) {
  const username = await getSessionUsername();
  if (!username) return NextResponse.json({ error: "Belum log masuk" }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({ total: 0, online: 0 });
  // sendBeacon posts text/plain, so read the raw body
  const body = (await req
    .text()
    .then((t) => JSON.parse(t || "{}"))
    .catch(() => ({}))) as { away?: unknown };
  const counts = await ping(redis, username, body.away === true);
  return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
}
