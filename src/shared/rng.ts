// Swappable random source. Games seed it for reproducible runs (e.g. a daily shift where
// everyone gets the same customers); otherwise it falls back to Math.random.
let source: () => number = Math.random;

export function rand() {
  return source();
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// mulberry32: tiny, fast, good enough for gameplay
export function seedRandom(seed: number) {
  let a = seed >>> 0;
  source = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function unseedRandom() {
  source = Math.random;
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
