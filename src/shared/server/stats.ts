import type { Redis } from "@upstash/redis";

/**
 * Player counts for the city HUD.
 * - total: everyone who ever registered (sorted set, score = createdAt)
 * - online: signed-in players who pinged in the last ONLINE_MS (score = last ping)
 */
const PLAYERS = "kl:players";
const ONLINE = "kl:online";
const BACKFILLED = "kl:players:backfilled";

/** A tab pings every 30 s; two missed pings and you drop off. */
export const ONLINE_MS = 75_000;

export type PlayerCounts = { total: number; online: number };

export async function addPlayer(redis: Redis, username: string, at = Date.now()) {
  await redis.zadd(PLAYERS, { score: at, member: username });
}

/** Accounts made before the counter existed: copy them in once. */
async function backfill(redis: Redis) {
  if ((await redis.set(BACKFILLED, 1, { nx: true })) !== "OK") return;
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, { match: "kl:user:*", count: 500 });
    cursor = String(next);
    const names = keys.map((k) => k.slice("kl:user:".length)).filter(Boolean);
    if (names.length) {
      const [first, ...rest] = names.map((member) => ({ score: 0, member }));
      await redis.zadd(PLAYERS, { nx: true }, first!, ...rest);
    }
  } while (cursor !== "0");
}

async function counts(redis: Redis, now: number): Promise<PlayerCounts> {
  await redis.zremrangebyscore(ONLINE, 0, now - ONLINE_MS);
  const [total, online] = await Promise.all([redis.zcard(PLAYERS), redis.zcard(ONLINE)]);
  return { total, online };
}

/** Mark `username` online (or away) and return fresh counts. */
export async function ping(redis: Redis, username: string, away = false): Promise<PlayerCounts> {
  const now = Date.now();
  await backfill(redis);
  if (away) await redis.zrem(ONLINE, username);
  else await Promise.all([redis.zadd(ONLINE, { score: now, member: username }), redis.zadd(PLAYERS, { nx: true }, { score: now, member: username })]);
  return counts(redis, now);
}
