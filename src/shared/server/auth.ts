import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getRedis } from "./redis";

export const USER_RE = /^[a-z0-9_]{5,20}$/;
export const PIN_RE = /^\d{6}$/;
export const SESSION_COOKIE = "kl_session";
const SESSION_DAYS = 30;

export type UserRecord = { pinHash: string; salt: string; createdAt: number };

export function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

function secret() {
  return process.env.AUTH_SECRET || process.env.KUALA_LEPAK_AUTH_SECRET || "kuala-lepak-dev-secret-change-me";
}

export function hashPin(pin: string, salt = randomBytes(16).toString("hex")) {
  const pinHash = scryptSync(pin, salt, 32).toString("hex");
  return { pinHash, salt };
}

export function verifyPin(pin: string, record: UserRecord) {
  const next = scryptSync(pin, record.salt, 32);
  const prev = Buffer.from(record.pinHash, "hex");
  return prev.length === next.length && timingSafeEqual(prev, next);
}

function sign(payload: string) {
  return createHash("sha256").update(`${payload}.${secret()}`).digest("base64url");
}

export function makeSessionToken(username: string) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const body = Buffer.from(JSON.stringify({ u: username, exp }), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: string; exp?: number };
    if (!data.u || !USER_RE.test(data.u) || !data.exp || data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

export async function getSessionUsername() {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function userKey(username: string) {
  return `kl:user:${username}`;
}

export function profileKey(username: string) {
  return `kl:profile:${username}`;
}

export async function rateLimited(kind: "ip" | "user", id: string) {
  const redis = getRedis();
  if (!redis) return false;
  const key = `kl:loginfail:${kind}:${id}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 900);
  return n > 12;
}

export async function clearLoginFails(username: string, ip: string) {
  const redis = getRedis();
  if (!redis) return;
  await Promise.all([redis.del(`kl:loginfail:user:${username}`), redis.del(`kl:loginfail:ip:${ip}`)]);
}
