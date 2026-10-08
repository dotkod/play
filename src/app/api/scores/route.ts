import { type NextRequest, NextResponse } from "next/server";
import { type Board, type Entry, getRedis, isPlausible, KEYS, NAME_RE, weekKey } from "@/games/anne-maju/leaderboard";

const TOP = 10;

type Player = { name: string; served: number };

async function top(key: string): Promise<Entry[]> {
  const redis = getRedis()!;
  const rows = await redis.zrange<string[]>(key, 0, TOP - 1, { rev: true, withScores: true });
  const ids = rows.filter((_, i) => i % 2 === 0);
  if (!ids.length) return [];
  const players = await redis.hmget<Record<string, Player>>(KEYS.players, ...ids);
  return ids.map((id, i) => ({
    name: players?.[id]?.name ?? "Anne",
    served: players?.[id]?.served ?? 0,
    earned: Number(rows[i * 2 + 1]),
  }));
}

export async function GET() {
  if (!getRedis()) return NextResponse.json({ week: [], all: [] } satisfies Board);
  const [week, all] = await Promise.all([top(KEYS.week(weekKey())), top(KEYS.all)]);
  return NextResponse.json({ week, all } satisfies Board, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Leaderboard belum dibuka" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { playerId?: unknown; name?: unknown; earned?: unknown; served?: unknown } | null;
  const playerId = typeof body?.playerId === "string" && /^[a-f0-9-]{36}$/.test(body.playerId) ? body.playerId : null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const earned = Number(body?.earned);
  const served = Number(body?.served);
  if (!playerId || !NAME_RE.test(name) || !isPlausible(earned, served)) {
    return NextResponse.json({ error: "Skor tak sah" }, { status: 400 });
  }

  const wk = KEYS.week(weekKey());
  const [previous, existing] = await Promise.all([redis.zscore(KEYS.all, playerId), redis.hget<Player>(KEYS.players, playerId)]);
  const isBest = previous === null || earned > Number(previous);
  // GT keeps each player's best score; the name always updates to the latest one typed
  await Promise.all([
    redis.zadd(KEYS.all, { gt: true }, { score: earned, member: playerId }),
    redis.zadd(wk, { gt: true }, { score: earned, member: playerId }),
    redis.expire(wk, 60 * 60 * 24 * 21),
    redis.hset(KEYS.players, { [playerId]: { name, served: isBest ? served : (existing?.served ?? served) } }),
  ]);
  const rank = await redis.zrevrank(wk, playerId);
  return NextResponse.json({ weekRank: rank === null ? null : rank + 1 });
}
