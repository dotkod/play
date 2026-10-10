import { Redis } from "@upstash/redis";
import { MemoryRedis } from "./memory-redis";

// Marketplace Upstash injects KV_REST_API_*; plain Upstash uses UPSTASH_REDIS_REST_*
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  // Local testing without the production database (never in a production build)
  if (process.env.KL_MEMORY_REDIS === "1" && process.env.NODE_ENV !== "production") {
    // On globalThis so every route bundle and hot reload shares one store
    const g = globalThis as { __klMemoryRedis?: MemoryRedis };
    g.__klMemoryRedis ??= new MemoryRedis();
    return g.__klMemoryRedis as unknown as Redis;
  }
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis ??= new Redis({ url, token });
  return redis;
}
