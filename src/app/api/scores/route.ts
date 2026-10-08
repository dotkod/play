import { type NextRequest, NextResponse } from "next/server";
import { type Board, dayKey, type Entry, getRedis, isPlausible, KEYS, NAME_RE, weekKey } from "@/games/anne-maju/leaderboard";

const TOP = 10;

type Player = { name: string; served: number };

// Top entries, one row per name (the same person on two devices only shows once)
async function top(key: string): Promise<Entry[]> {
  const redis = getRedis()!;
  const rows = await redis.zrange<string[]>(key, 0, TOP * 3 - 1, { rev: true, withScores: true });
  const ids = rows.filter((_, i) => i % 2 === 0);
  if (!ids.length) return [];
  const players = await redis.hmget<Record<string, Player>>(KEYS.players, ...ids);
  const seen = new Set<string>();
  const out: Entry[] = [];
  ids.forEach((id, i) => {
    const name = players?.[id]?.name ?? "Anne";
    const key = name.toLowerCase();
    if (seen.has(key) || out.length >= TOP) return;
    seen.add(key);
    out.push({ name, served: players?.[id]?.served ?? 0, earned: Number(rows[i * 2 + 1]) });
  });
  return out;
}

export async function GET() {
  if (!getRedis()) return NextResponse.json({ today: [], week: [], all: [] } satisfies Board);
  const [today, week, all] = await Promise.all([top(KEYS.daily(dayKey())), top(KEYS.week(weekKey())), top(KEYS.all)]);
  return NextResponse.json({ today, week, all } satisfies Board, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Leaderboard belum dibuka" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    playerId?: unknown;
    name?: unknown;
    earned?: unknown;
    served?: unknown;
    mode?: unknown;
    day?: unknown;
  } | null;
  const playerId = typeof body?.playerId === "string" && /^[a-f0-9-]{36}$/.test(body.playerId) ? body.playerId : null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const earned = Number(body?.earned);
  const served = Number(body?.served);
  if (!playerId || !NAME_RE.test(name) || !isPlausible(earned, served)) {
    return NextResponse.json({ error: "Skor tak sah" }, { status: 400 });
  }
  // Daily scores only count for today's board (allow a few minutes either side of midnight)
  const today = dayKey();
  const daily = body?.mode === "daily" && (body.day === today || body.day === dayKey(new Date(Date.now() - 10 * 60_000)));

  const wk = KEYS.week(weekKey());
  const [previous, existing] = await Promise.all([redis.zscore(KEYS.all, playerId), redis.hget<Player>(KEYS.players, playerId)]);
  const isBest = previous === null || earned > Number(previous);
  // GT keeps each player's best score; the name always updates to the latest one typed
  const writes: Promise<unknown>[] = [
    redis.zadd(KEYS.all, { gt: true }, { score: earned, member: playerId }),
    redis.zadd(wk, { gt: true }, { score: earned, member: playerId }),
    redis.expire(wk, 60 * 60 * 24 * 21),
    redis.hset(KEYS.players, { [playerId]: { name, served: isBest ? served : (existing?.served ?? served) } }),
  ];
  if (daily) {
    const dk = KEYS.daily(body!.day as string);
    writes.push(redis.zadd(dk, { gt: true }, { score: earned, member: playerId }), redis.expire(dk, 60 * 60 * 24 * 3));
  }
  await Promise.all(writes);
  const rank = await redis.zrevrank(daily ? KEYS.daily(body!.day as string) : wk, playerId);
  return NextResponse.json({ rank: rank === null ? null : rank + 1, daily });
}
