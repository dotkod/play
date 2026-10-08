import { Redis } from "@upstash/redis";

export type Entry = { name: string; earned: number; served: number };
export type Board = { today: Entry[]; week: Entry[]; all: Entry[] };

// Payload checks: names stay short and printable, scores stay inside what one 90s shift can earn
export const NAME_RE = /^[\p{L}\p{N} ._'-]{2,16}$/u;
const MAX_SERVED = 60;
const MAX_SEN_PER_DRINK = 650;

export function isPlausible(earned: number, served: number) {
  return Number.isInteger(earned) && Number.isInteger(served) && served >= 1 && served <= MAX_SERVED && earned > 0 && earned <= served * MAX_SEN_PER_DRINK;
}

// Marketplace Upstash injects KV_REST_API_*; plain Upstash uses UPSTASH_REDIS_REST_*
let redis: Redis | null = null;
export function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis ??= new Redis({ url, token });
  return redis;
}

// ISO week in Malaysia time so the weekly board resets Monday 00:00 MYT
export function weekKey(now = new Date()) {
  const d = new Date(now.getTime() + 8 * 3600_000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-w${week}`;
}

// Malaysia calendar day, e.g. "2026-10-08" (matches the client's daily shift seed)
export function dayKey(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

export const KEYS = {
  all: "anne-maju:scores:all",
  week: (wk: string) => `anne-maju:scores:${wk}`,
  daily: (day: string) => `anne-maju:daily:${day}`,
  players: "anne-maju:players",
};
