import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  USER_RE,
  PIN_RE,
  hashPin,
  makeSessionToken,
  normalizeUsername,
  profileKey,
  userKey,
  type UserRecord,
} from "@/shared/server/auth";
import { getRedis } from "@/shared/server/redis";

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Cloud belum dibuka" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    username?: unknown;
    pin?: unknown;
    profile?: unknown;
  } | null;

  const username = typeof body?.username === "string" ? normalizeUsername(body.username) : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!USER_RE.test(username)) {
    return NextResponse.json({ error: "Username: @ + 5-20 huruf/nombor/_" }, { status: 400 });
  }
  if (!PIN_RE.test(pin)) {
    return NextResponse.json({ error: "PIN mesti 6 digit" }, { status: 400 });
  }

  const existing = await redis.get<UserRecord>(userKey(username));
  if (existing) return NextResponse.json({ error: "Username dah diambil" }, { status: 409 });

  const { pinHash, salt } = hashPin(pin);
  const record: UserRecord = { pinHash, salt, createdAt: Date.now() };
  const created = await redis.set(userKey(username), record, { nx: true });
  if (created !== "OK") return NextResponse.json({ error: "Username dah diambil" }, { status: 409 });

  if (body?.profile && typeof body.profile === "object") {
    const profile = { ...(body.profile as object), username, updatedAt: Date.now() };
    await redis.set(profileKey(username), profile);
  }

  const res = NextResponse.json({ username });
  res.cookies.set(SESSION_COOKIE, makeSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}
