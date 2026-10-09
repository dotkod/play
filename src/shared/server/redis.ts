import { Redis } from "@upstash/redis";

// Marketplace Upstash injects KV_REST_API_*; plain Upstash uses UPSTASH_REDIS_REST_*
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis ??= new Redis({ url, token });
  return redis;
}
