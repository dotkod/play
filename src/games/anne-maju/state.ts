import { rand } from "@/shared/rng";
import type { Look } from "@/shared/three/look";
import { type Cup, type Drink, drinkDiff, drinkPrice, isCupComplete, sameDrink } from "./drinks";

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
const FOREVER = 1e9; // ~11 days: "never" as an offset from now

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

export type Phase = "intro" | "tutorial" | "tutorialDone" | "playing" | "paused" | "over";
export type Mode = "normal" | "daily";

export type GameState = {
  phase: Phase;
  mode: Mode;
  startAt: number;
  now: number;
  pausedAt: number;
  tables: (Party | null)[];
  cup: Cup;
  earned: number; // sen
  sales: number; // drink prices
  tips: number;
  wasted: number;
  served: number;
  wrong: number;
  walkouts: number;
  streak: number;
  bestStreak: number;
  nextSpawnAt: number;
  bubbles: Bubble[];
  // The order you tapped to note down; shown on the counter until that table is done
  slip: { table: number; partyId: number } | null;
  seq: number;
};

// Payload built outside the reducer so Strict Mode double-invokes stay deterministic
export type Spawn = { table: number; guests: Guest[]; seed: number };

export type Lines = {
  happy: string;
  wrong: string;
  leave: string;
  annoyed: string;
  refused: string;
  // Explains a wrong drink, e.g. "Nak kurang manis, bukan biasa"
  explain: (want: Drink, got: Drink, fields: (keyof Drink)[]) => string;
};

export type Action =
  | { type: "reset" }
  | { type: "start"; now: number; mode: Mode }
  | { type: "tutorial"; now: number; spawn: Spawn }
  | { type: "tick"; now: number; spawn: Spawn | null; lines: Lines }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "pick"; part: Step; value: string }
  | { type: "rewind"; part: Step }
  | { type: "discard" }
  | { type: "serve"; table: number; lines: Lines }
  | { type: "askAgain"; table: number; lines: Lines }
  | { type: "pin"; table: number };

export const initialState: GameState = {
  phase: "intro",
  mode: "normal",
  startAt: 0,
  now: 0,
  pausedAt: 0,
  tables: Array(TABLE_COUNT).fill(null),
  cup: DEFAULT_CUP,
  earned: 0,
  sales: 0,
  tips: 0,
  wasted: 0,
  served: 0,
  wrong: 0,
  walkouts: 0,
  streak: 0,
  bestStreak: 0,
  nextSpawnAt: 0,
  bubbles: [],
  slip: null,
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
  const r = rand();
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

export const isLive = (s: GameState) => s.phase === "playing" || s.phase === "tutorial";

// Pausing freezes the world: every absolute timestamp moves forward by the paused duration
function shiftTimes(s: GameState, dt: number): GameState {
  return {
    ...s,
    startAt: s.startAt + dt,
    nextSpawnAt: s.nextSpawnAt + dt,
    bubbles: s.bubbles.map((b) => ({ ...b, until: b.until + dt })),
    tables: s.tables.map((p) =>
      p ? { ...p, arrivedAt: p.arrivedAt + dt, seatedAt: p.seatedAt + dt, revealUntil: p.revealUntil + dt, leaveAt: p.leaveAt + dt } : p,
    ),
  };
}

function seat(s: GameState, spawn: Spawn, now: number, tutorial = false): GameState {
  const d = difficulty(s);
  const n = spawn.guests.length;
  const patience = tutorial ? FOREVER : patienceMs(d, n);
  const tables = [...s.tables];
  tables[spawn.table] = {
    id: s.seq + 1,
    guests: spawn.guests,
    seed: spawn.seed,
    arrivedAt: now,
    seatedAt: now + ARRIVE_MS,
    revealUntil: now + ARRIVE_MS + (tutorial ? FOREVER : revealMs(d, n)),
    patienceMs: patience,
    leaveAt: now + ARRIVE_MS + patience,
    asks: 0,
  };
  return { ...s, tables, seq: s.seq + 1, nextSpawnAt: now + spawnGapMs(d) * (0.8 + n * 0.2) };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    // Back to the counter: no shift running (stop mid-shift, or close the results)
    case "reset":
      return initialState;

    case "start":
      return { ...initialState, mode: a.mode, phase: "playing", startAt: a.now, now: a.now, nextSpawnAt: a.now + 600 };

    // One patient customer, no clock, for first-time players
    case "tutorial":
      return seat({ ...initialState, phase: "tutorial", startAt: a.now, now: a.now }, a.spawn, a.now, true);

    case "pause":
      return s.phase === "playing" ? { ...s, phase: "paused", pausedAt: a.now } : s;

    case "resume":
      return s.phase === "paused" ? { ...shiftTimes(s, a.now - s.pausedAt), phase: "playing", now: a.now } : s;

    case "tick": {
      if (!isLive(s)) return s;
      let next: GameState = { ...s, now: a.now, bubbles: s.bubbles.filter((b) => b.until > a.now) };
      if (s.phase === "tutorial") return next;

      if (timeLeft(next) === 0) return { ...next, phase: "over" };

      // Groups who waited too long walk out
      next.tables.forEach((p, i) => {
        if (p && p.leaveAt <= a.now) {
          const tables = [...next.tables];
          tables[i] = null;
          next = bubble({ ...next, tables, walkouts: next.walkouts + 1, streak: 0 }, i, a.lines.leave, "bad");
        }
      });

      if (a.spawn && a.now >= next.nextSpawnAt && !next.tables[a.spawn.table]) next = seat(next, a.spawn, a.now);
      return next;
    }

    case "pick": {
      if (!isLive(s) || currentStep(s.cup) !== a.part) return s;
      return { ...s, cup: { ...s.cup, [a.part]: a.value } };
    }

    case "rewind": {
      // Going back to a step clears it and everything after it
      const keep = STEPS.slice(0, STEPS.indexOf(a.part));
      return { ...s, cup: Object.fromEntries(keep.map((p) => [p, s.cup[p]])) as Cup };
    }

    case "discard":
      return { ...s, cup: DEFAULT_CUP };

    case "pin": {
      const p = s.tables[a.table];
      if (!isLive(s) || !p || s.now < p.seatedAt) return s;
      return { ...s, slip: { table: a.table, partyId: p.id } };
    }

    case "serve": {
      const p = s.tables[a.table];
      if (!isLive(s) || !p || s.now < p.seatedAt || !isCupComplete(s.cup)) return s;
      const cup = s.cup;
      const target = p.guests.findIndex((g) => !g.served && sameDrink(cup, g.order));
      const tables = [...s.tables];

      if (target >= 0) {
        const guests = p.guests.map((g, i) => (i === target ? { ...g, served: true } : g));
        const done = guests.every((g) => g.served);
        tables[a.table] = done ? null : { ...p, guests };
        const streak = s.streak + 1;
        // Tip shrinks with waiting and with every time they had to repeat the order
        const tip = s.phase === "tutorial" ? 0 : Math.round(patienceLeft(p, s.now) * 100 * Math.pow(0.5, p.asks)) + Math.min(streak, 10) * 10;
        const price = drinkPrice(guests[target].order);
        // Someone else still wants this exact drink? Keep it in hand for the next serve
        const again = tables.some((t) => t?.guests.some((g) => !g.served && sameDrink(cup, g.order)));
        const next: GameState = {
          ...s,
          tables,
          cup: again ? cup : DEFAULT_CUP,
          earned: s.earned + price + tip,
          sales: s.sales + price,
          tips: s.tips + tip,
          served: s.served + 1,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          slip: done && s.slip?.partyId === p.id ? null : s.slip,
          phase: s.phase === "tutorial" && done ? "tutorialDone" : s.phase,
        };
        return bubble(next, a.table, `+RM${((price + tip) / 100).toFixed(2)} ${a.lines.happy}`, "good");
      }

      // Wrong drink: say what was off (against the closest unserved order) and lose some patience
      const pending = p.guests.filter((g) => !g.served).map((g) => g.order);
      const closest = pending.reduce((best, o) => (drinkDiff(o, cup).length < drinkDiff(best, cup).length ? o : best), pending[0]);
      const why = closest ? a.lines.explain(closest, cup, drinkDiff(closest, cup)) : a.lines.wrong;
      tables[a.table] = { ...p, leaveAt: Math.max(s.now + 2000, p.leaveAt - p.patienceMs * 0.15) };
      const waste = s.phase === "tutorial" ? 0 : Math.min(WASTE_SEN, s.earned);
      const next = { ...s, tables, cup: DEFAULT_CUP, wrong: s.wrong + 1, streak: 0, earned: s.earned - waste, wasted: s.wasted + waste };
      return bubble(next, a.table, why, "bad", 2800);
    }

    case "askAgain": {
      const p = s.tables[a.table];
      if (!isLive(s) || !p || s.now < p.revealUntil) return s;
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

function bubble(s: GameState, table: number, text: string, kind: Bubble["kind"], ms = 1600): GameState {
  const id = s.seq + 1;
  return { ...s, seq: id, bubbles: [...s.bubbles, { id, table, text, kind, until: s.now + ms }] };
}
