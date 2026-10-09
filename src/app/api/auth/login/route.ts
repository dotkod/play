import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  USER_RE,
  PIN_RE,
  clearLoginFails,
  makeSessionToken,
  normalizeUsername,
  rateLimited,
  userKey,
  verifyPin,
  type UserRecord,
} from "@/shared/server/auth";
import { getRedis } from "@/shared/server/redis";

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Cloud belum dibuka" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { username?: unknown; pin?: unknown } | null;
  const username = typeof body?.username === "string" ? normalizeUsername(body.username) : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!USER_RE.test(username) || !PIN_RE.test(pin)) {
    return NextResponse.json({ error: "Username atau PIN salah" }, { status: 400 });
  }
  if ((await rateLimited("ip", ip)) || (await rateLimited("user", username))) {
    return NextResponse.json({ error: "Cuba lagi nanti" }, { status: 429 });
  }

  const record = await redis.get<UserRecord>(userKey(username));
  if (!record || !verifyPin(pin, record)) {
    return NextResponse.json({ error: "Username atau PIN salah" }, { status: 401 });
  }

  await clearLoginFails(username, ip);
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
