/**
 * In-memory stand-in for the few Upstash calls the app makes, for local dev only
 * (`KL_MEMORY_REDIS=1 pnpm dev`). Lets you sign up, log in and post scores without
 * touching the production database. Data is lost when the dev server restarts.
 */

type ZEntry = { score: number; member: string };

export class MemoryRedis {
  private kv = new Map<string, unknown>();
  private hashes = new Map<string, Map<string, unknown>>();
  private zsets = new Map<string, Map<string, number>>();
  private expiry = new Map<string, number>();

  private alive(key: string) {
    const at = this.expiry.get(key);
    if (at != null && at <= Date.now()) {
      this.kv.delete(key);
      this.hashes.delete(key);
      this.zsets.delete(key);
      this.expiry.delete(key);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.alive(key);
    return (this.kv.get(key) as T) ?? null;
  }

  async set(key: string, value: unknown, opts?: { nx?: boolean }) {
    this.alive(key);
    if (opts?.nx && this.kv.has(key)) return null;
    this.kv.set(key, structuredClone(value));
    this.expiry.delete(key);
    return "OK";
  }

  async del(...keys: string[]) {
    let n = 0;
    for (const k of keys) {
      if (this.kv.delete(k) || this.hashes.delete(k) || this.zsets.delete(k)) n++;
      this.expiry.delete(k);
    }
    return n;
  }

  async incr(key: string) {
    this.alive(key);
    const n = Number(this.kv.get(key) ?? 0) + 1;
    this.kv.set(key, n);
    return n;
  }

  async expire(key: string, seconds: number) {
    this.expiry.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    this.alive(key);
    return (this.hashes.get(key)?.get(field) as T) ?? null;
  }

  async hmget<T extends Record<string, unknown>>(key: string, ...fields: string[]): Promise<T | null> {
    this.alive(key);
    const h = this.hashes.get(key);
    if (!h) return null;
    return Object.fromEntries(fields.map((f) => [f, h.get(f) ?? null])) as T;
  }

  async hset(key: string, values: Record<string, unknown>) {
    const h = this.hashes.get(key) ?? new Map();
    for (const [f, v] of Object.entries(values)) h.set(f, structuredClone(v));
    this.hashes.set(key, h);
    return Object.keys(values).length;
  }

  async zadd(key: string, opts: { gt?: boolean }, ...entries: ZEntry[]) {
    this.alive(key);
    const z = this.zsets.get(key) ?? new Map<string, number>();
    let added = 0;
    for (const { score, member } of entries) {
      const prev = z.get(member);
      if (prev == null) added++;
      if (prev == null || !opts.gt || score > prev) z.set(member, score);
    }
    this.zsets.set(key, z);
    return added;
  }

  async zscore(key: string, member: string) {
    this.alive(key);
    return this.zsets.get(key)?.get(member) ?? null;
  }

  private sorted(key: string, rev: boolean) {
    const rows = [...(this.zsets.get(key) ?? new Map<string, number>()).entries()];
    rows.sort((a, b) => (rev ? b[1] - a[1] : a[1] - b[1]));
    return rows;
  }

  async zrange<T extends unknown[]>(key: string, start: number, stop: number, opts?: { rev?: boolean; withScores?: boolean }): Promise<T> {
    this.alive(key);
    const rows = this.sorted(key, !!opts?.rev).slice(start, stop < 0 ? undefined : stop + 1);
    return (opts?.withScores ? rows.flat() : rows.map(([m]) => m)) as T;
  }

  async zrevrank(key: string, member: string) {
    this.alive(key);
    const i = this.sorted(key, true).findIndex(([m]) => m === member);
    return i < 0 ? null : i;
  }
}
