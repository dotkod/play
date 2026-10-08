import { type Cup, type Drink, drinkPrice, isCupComplete, sameDrink } from "./drinks";
import type { Look } from "./scene/look";

export const SHIFT_MS = 90_000;
export const TABLE_COUNT = 6;
export const MAX_ASKS = 2;
// Drinks are built in four picks, always in this order
export const STEPS = ["temp", "base", "milk", "sugar"] as const;
export type Step = (typeof STEPS)[number];
export const DEFAULT_CUP: Cup = {};

export function currentStep(cup: Cup): Step | null {
  return STEPS.find((p) => !cup[p]) ?? null;
}
const WASTE_SEN = 50;

// Customers walk in from the road before they can order
export const ARRIVE_MS = 1500;
export const LEAVE_MS = 1400;

export type Guest = { look: Look; order: Drink; served: boolean };

// One table's group. Everyone orders at once and leaves together once all drinks arrive.
export type Party = {
  id: number;
  guests: Guest[];
  seed: number; // picks the phrasing of the order so it re-renders identically in either language
  arrivedAt: number;
  seatedAt: number;
  revealUntil: number;
  patienceMs: number;
  leaveAt: number;
  asks: number;
};

export type Bubble = { id: number; table: number; text: string; kind: "good" | "bad"; until: number };

export type Phase = "intro" | "playing" | "over";

export type GameState = {
  phase: Phase;
  startAt: number;
  now: number;
  tables: (Party | null)[];
  cup: Cup;
  earned: number; // sen
  served: number;
  wrong: number;
  walkouts: number;
  streak: number;
  bestStreak: number;
  nextSpawnAt: number;
  bubbles: Bubble[];
  seq: number;
};

// Payload built outside the reducer so Strict Mode double-invokes stay deterministic
export type Spawn = { table: number; guests: Guest[]; seed: number };

export type Lines = { happy: string; wrong: string; leave: string; annoyed: string; refused: string };

export type Action =
  | { type: "start"; now: number }
  | { type: "tick"; now: number; spawn: Spawn | null; lines: Lines }
  | { type: "pick"; part: Step; value: string }
  | { type: "rewind"; part: Step }
  | { type: "discard" }
  | { type: "serve"; table: number; lines: Lines }
  | { type: "askAgain"; table: number; lines: Lines };

export const initialState: GameState = {
  phase: "intro",
  startAt: 0,
  now: 0,
  tables: Array(TABLE_COUNT).fill(null),
  cup: DEFAULT_CUP,
  earned: 0,
  served: 0,
  wrong: 0,
  walkouts: 0,
  streak: 0,
  bestStreak: 0,
  nextSpawnAt: 0,
  bubbles: [],
  seq: 0,
};

export function difficulty(s: GameState): number {
  return Math.min(1, Math.max(0, (s.now - s.startAt) / SHIFT_MS));
}

// Bigger groups get longer to read and more patience, since every drink is a separate trip
const revealMs = (d: number, n: number) => 5000 - d * 2000 + (n - 1) * 1800;
const patienceMs = (d: number, n: number) => 24_000 - d * 8000 + (n - 1) * 9000;
const spawnGapMs = (d: number) => 5500 - d * 2500;

// Solo early on, then couples, then groups of three
export function partySize(d: number): number {
  const r = Math.random();
  if (d < 0.2) return 1;
  if (d < 0.55) return r < 0.6 ? 1 : 2;
  return r < 0.35 ? 1 : r < 0.75 ? 2 : 3;
}

export function timeLeft(s: GameState): number {
  return Math.max(0, SHIFT_MS - (s.now - s.startAt));
}

export function patienceLeft(p: Party, now: number) {
  return Math.max(0, Math.min(1, (p.leaveAt - now) / p.patienceMs));
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "start":
      return { ...initialState, phase: "playing", startAt: a.now, now: a.now, nextSpawnAt: a.now + 600 };

    case "tick": {
      if (s.phase !== "playing") return s;
      let next: GameState = { ...s, now: a.now, bubbles: s.bubbles.filter((b) => b.until > a.now) };

      if (timeLeft(next) === 0) return { ...next, phase: "over" };

      // Groups who waited too long walk out
      next.tables.forEach((p, i) => {
        if (p && p.leaveAt <= a.now) {
          const tables = [...next.tables];
          tables[i] = null;
          next = bubble({ ...next, tables, walkouts: next.walkouts + 1, streak: 0 }, i, a.lines.leave, "bad");
        }
      });

      if (a.spawn && a.now >= next.nextSpawnAt && !next.tables[a.spawn.table]) {
        const d = difficulty(next);
        const n = a.spawn.guests.length;
        const tables = [...next.tables];
        const patience = patienceMs(d, n);
        tables[a.spawn.table] = {
          id: next.seq + 1,
          guests: a.spawn.guests,
          seed: a.spawn.seed,
          arrivedAt: a.now,
          seatedAt: a.now + ARRIVE_MS,
          revealUntil: a.now + ARRIVE_MS + revealMs(d, n),
          patienceMs: patience,
          leaveAt: a.now + ARRIVE_MS + patience,
          asks: 0,
        };
        next = { ...next, tables, seq: next.seq + 1, nextSpawnAt: a.now + spawnGapMs(d) * (0.8 + n * 0.2) };
      }
      return next;
    }

    case "pick": {
      if (s.phase !== "playing" || currentStep(s.cup) !== a.part) return s;
      return { ...s, cup: { ...s.cup, [a.part]: a.value } };
    }

    case "rewind": {
      // Going back to a step clears it and everything after it
      const keep = STEPS.slice(0, STEPS.indexOf(a.part));
      return { ...s, cup: Object.fromEntries(keep.map((p) => [p, s.cup[p]])) as Cup };
    }

    case "discard":
      return { ...s, cup: DEFAULT_CUP };

    case "serve": {
      const p = s.tables[a.table];
      if (s.phase !== "playing" || !p || s.now < p.seatedAt || !isCupComplete(s.cup)) return s;
      const cup = s.cup;
      const target = p.guests.findIndex((g) => !g.served && sameDrink(cup, g.order));
      const tables = [...s.tables];

      if (target >= 0) {
        const guests = p.guests.map((g, i) => (i === target ? { ...g, served: true } : g));
        const done = guests.every((g) => g.served);
        tables[a.table] = done ? null : { ...p, guests };
        const streak = s.streak + 1;
        // Tip shrinks with waiting and with every time they had to repeat the order
        const tip = Math.round(patienceLeft(p, s.now) * 100 * Math.pow(0.5, p.asks)) + Math.min(streak, 10) * 10;
        const earned = drinkPrice(guests[target].order) + tip;
        const next = {
          ...s,
          tables,
          cup: DEFAULT_CUP,
          earned: s.earned + earned,
          served: s.served + 1,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
        };
        return bubble(next, a.table, `+RM${(earned / 100).toFixed(2)} ${a.lines.happy}`, "good");
      }

      // Wrong drink: they keep waiting, but get less patient
      tables[a.table] = { ...p, leaveAt: Math.max(s.now + 2000, p.leaveAt - p.patienceMs * 0.15) };
      const next = { ...s, tables, cup: DEFAULT_CUP, wrong: s.wrong + 1, streak: 0, earned: Math.max(0, s.earned - WASTE_SEN) };
      return bubble(next, a.table, a.lines.wrong, "bad");
    }

    case "askAgain": {
      const p = s.tables[a.table];
      if (s.phase !== "playing" || !p || s.now < p.revealUntil) return s;
      if (p.asks >= MAX_ASKS) return bubble(s, a.table, a.lines.refused, "bad");
      const tables = [...s.tables];
      // Each repeat costs a fifth of their patience
      tables[a.table] = {
        ...p,
        asks: p.asks + 1,
        revealUntil: s.now + 1800 + (p.guests.length - 1) * 600,
        leaveAt: Math.max(s.now + 3000, p.leaveAt - p.patienceMs * 0.2),
      };
      const next = { ...s, tables };
      return p.asks + 1 === MAX_ASKS ? bubble(next, a.table, a.lines.annoyed, "bad") : next;
    }
  }
}

function bubble(s: GameState, table: number, text: string, kind: Bubble["kind"]): GameState {
  const id = s.seq + 1;
  return { ...s, seq: id, bubbles: [...s.bubbles, { id, table, text, kind, until: s.now + 1600 }] };
}
