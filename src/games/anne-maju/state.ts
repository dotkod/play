import {
  type Cup,
  type Drink,
  drinkPrice,
  HAPPY_LINES,
  isCupComplete,
  LEAVE_LINES,
  sameDrink,
  WRONG_LINES,
} from "./drinks";
import type { Look } from "./scene/look";

export const SHIFT_MS = 90_000;
export const TABLE_COUNT = 4;
// Drinks are built in four picks, always in this order
export const STEPS = ["temp", "base", "milk", "sugar"] as const;
export type Step = (typeof STEPS)[number];
export const DEFAULT_CUP: Cup = {};

export function currentStep(cup: Cup): Step | null {
  return STEPS.find((p) => !cup[p]) ?? null;
}
const WASTE_SEN = 50;

// Customers walk in from the road before they can order
export const ARRIVE_MS = 1300;
export const LEAVE_MS = 1300;

export type Customer = {
  id: number;
  look: Look;
  order: Drink;
  phrase: string;
  arrivedAt: number;
  seatedAt: number;
  revealUntil: number;
  leaveAt: number;
  askedAgain: boolean;
};

export type Bubble = { id: number; table: number; text: string; kind: "good" | "bad"; until: number };

export type Phase = "intro" | "playing" | "over";

export type GameState = {
  phase: Phase;
  startAt: number;
  now: number;
  tables: (Customer | null)[];
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
export type Spawn = Omit<Customer, "id" | "arrivedAt" | "seatedAt" | "revealUntil" | "leaveAt"> & { table: number };

export type Action =
  | { type: "start"; now: number }
  | { type: "tick"; now: number; spawn: Spawn | null; line: string }
  | { type: "pick"; part: Step; value: string }
  | { type: "rewind"; part: Step }
  | { type: "discard" }
  | { type: "serve"; table: number; line: string }
  | { type: "askAgain"; table: number };

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

const revealMs = (d: number) => 5000 - d * 2000;
const patienceMs = (d: number) => 24_000 - d * 8000;
const spawnGapMs = (d: number) => 6000 - d * 3000;


export function timeLeft(s: GameState): number {
  return Math.max(0, SHIFT_MS - (s.now - s.startAt));
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "start":
      return { ...initialState, phase: "playing", startAt: a.now, now: a.now, nextSpawnAt: a.now + 600 };

    case "tick": {
      if (s.phase !== "playing") return s;
      let next: GameState = { ...s, now: a.now, bubbles: s.bubbles.filter((b) => b.until > a.now) };

      if (timeLeft(next) === 0) return { ...next, phase: "over" };

      // Customers who waited too long walk out
      next.tables.forEach((c, i) => {
        if (c && c.leaveAt <= a.now) {
          const tables = [...next.tables];
          tables[i] = null;
          next = bubble({ ...next, tables, walkouts: next.walkouts + 1, streak: 0 }, i, a.line, "bad");
        }
      });

      if (a.spawn && a.now >= next.nextSpawnAt && !next.tables[a.spawn.table]) {
        const d = difficulty(next);
        const { table, ...rest } = a.spawn;
        const tables = [...next.tables];
        tables[table] = {
          ...rest,
          id: next.seq + 1,
          arrivedAt: a.now,
          seatedAt: a.now + ARRIVE_MS,
          revealUntil: a.now + ARRIVE_MS + revealMs(d),
          leaveAt: a.now + ARRIVE_MS + patienceMs(d),
          askedAgain: false,
        };
        next = { ...next, tables, seq: next.seq + 1, nextSpawnAt: a.now + spawnGapMs(d) };
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
      const c = s.tables[a.table];
      if (s.phase !== "playing" || !c || s.now < c.seatedAt || !isCupComplete(s.cup)) return s;
      const tables = [...s.tables];
      tables[a.table] = null;

      if (sameDrink(s.cup, c.order)) {
        const waitedRatio = (c.leaveAt - s.now) / (c.leaveAt - c.seatedAt);
        const streak = s.streak + 1;
        const tip = Math.round(Math.max(0, waitedRatio) * 100 * (c.askedAgain ? 0.3 : 1)) + Math.min(streak, 10) * 10;
        const earned = drinkPrice(c.order) + tip;
        const next = {
          ...s,
          tables,
          cup: DEFAULT_CUP,
          earned: s.earned + earned,
          served: s.served + 1,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
        };
        return bubble(next, a.table, `+RM${(earned / 100).toFixed(2)} ${a.line}`, "good");
      }

      const next = { ...s, tables, cup: DEFAULT_CUP, wrong: s.wrong + 1, streak: 0, earned: Math.max(0, s.earned - WASTE_SEN) };
      return bubble(next, a.table, a.line, "bad");
    }

    case "askAgain": {
      const c = s.tables[a.table];
      if (s.phase !== "playing" || !c || s.now < c.revealUntil) return s;
      const tables = [...s.tables];
      tables[a.table] = { ...c, askedAgain: true, revealUntil: s.now + 1500 };
      return { ...s, tables };
    }
  }
}

function bubble(s: GameState, table: number, text: string, kind: Bubble["kind"]): GameState {
  const id = s.seq + 1;
  return { ...s, seq: id, bubbles: [...s.bubbles, { id, table, text, kind, until: s.now + 1600 }] };
}

export const lines = { HAPPY_LINES, WRONG_LINES, LEAVE_LINES };
