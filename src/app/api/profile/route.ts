import { type NextRequest, NextResponse } from "next/server";
import { getSessionUsername, profileKey } from "@/shared/server/auth";
import { getRedis } from "@/shared/server/redis";

export async function GET() {
  const username = await getSessionUsername();
  if (!username) return NextResponse.json({ error: "Belum log masuk" }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Cloud belum dibuka" }, { status: 503 });
  const profile = await redis.get(profileKey(username));
  return NextResponse.json({ username, profile });
}

export async function PUT(req: NextRequest) {
  const username = await getSessionUsername();
  if (!username) return NextResponse.json({ error: "Belum log masuk" }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Cloud belum dibuka" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { profile?: unknown } | null;
  if (!body?.profile || typeof body.profile !== "object") {
    return NextResponse.json({ error: "Profile tak sah" }, { status: 400 });
  }
  const profile = { ...(body.profile as object), username, updatedAt: Date.now() };
  await redis.set(profileKey(username), profile);
  return NextResponse.json({ ok: true });
}
