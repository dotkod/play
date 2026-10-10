/**
 * Traffic simulation (pure, no React or three). Vehicles drive their lane, stop at the stop
 * line on red, keep a gap to whatever is ahead (cars, bikes, the player, pedestrians), take
 * curved turns through junctions, and yield so two vehicles never share the same space.
 */

import type { GridNode } from "../plan/grid";
import { type Lane, STOP_BACK, turnCurve, turnKind } from "../plan/lanes";
import { seeded } from "../plan/lots";
import { type Brand, CAR_PAINTS, type CarKind, VEHICLE_SIZE, type VehicleKind } from "../kit/vehicles";

export type SignalColour = "green" | "amber" | "red";

/** One shared cycle; each junction is offset so the city doesn't flash in sync. */
const GREEN = 8;
const AMBER = 2;
const ALL_RED = 1.2;
export const CYCLE = 2 * (GREEN + AMBER + ALL_RED);

export function signalFor(node: GridNode, axis: "x" | "z", t: number): SignalColour {
  const phase = (((t + (node.i + node.j) * 3.3) % CYCLE) + CYCLE) % CYCLE;
  const half = GREEN + AMBER + ALL_RED;
  const local = axis === "x" ? phase : (phase - half + CYCLE) % CYCLE;
  if (local < GREEN) return "green";
  if (local < GREEN + AMBER) return "amber";
  return "red";
}

export type Vehicle = {
  id: number;
  kind: VehicleKind;
  /** Car body or brand, for the renderer. */
  look: { car?: CarKind; paint?: string; brand?: Brand; delivery?: boolean };
  len: number;
  width: number;
  maxSpeed: number;
  lane: Lane;
  s: number;
  speed: number;
  turn: null | { to: Lane; at: (t: number) => { x: number; z: number }; len: number; s: number };
  /** Next lane picked when we arrive at the junction (so the yield rules know our turn). */
  plan: Lane;
  x: number;
  z: number;
  rot: number;
  stuck: number;
  ghostUntil: number;
  honkAt: number;
};

export type Obstacle = { x: number; z: number; r: number };

const ACCEL = 4;
const BRAKE = 9;
const MIN_GAP = 1.6;
const LOOK = 16;

function lanePos(l: Lane, s: number) {
  return { x: l.start.x + l.dir.x * s, z: l.start.z + l.dir.z * s };
}

function pickNext(lane: Lane, rnd: () => number) {
  const opts = lane.next;
  const weight = (o: Lane) => {
    const k = turnKind(lane.dir, o.dir);
    return k === "straight" ? 0.55 : k === "left" ? 0.25 : k === "right" ? 0.2 : 0.02;
  };
  const total = opts.reduce((a, o) => a + weight(o), 0);
  let r = rnd() * total;
  for (const o of opts) {
    r -= weight(o);
    if (r <= 0) return o;
  }
  return opts[0];
}

export function createTraffic(lanes: Lane[], count: number, seed = 7) {
  const rnd = seeded(seed);
  const vehicles: Vehicle[] = [];
  const cars: CarKind[] = ["hatch", "sedan", "sedan", "suv", "mpv", "taxi"];
  const brands: Brand[] = ["grap", "shopi", "pandai", "lalamoov"];
  // Spread vehicles evenly over the lanes with room between them
  const order = lanes.map((l, i) => ({ l, k: rnd() + i * 0 })).sort((a, b) => a.k - b.k);
  for (let n = 0; n < count; n++) {
    const lane = order[n % order.length].l;
    const slot = Math.floor(n / order.length);
    const r = rnd();
    let kind: VehicleKind;
    const look: Vehicle["look"] = {};
    if (r < 0.58) {
      kind = cars[Math.floor(rnd() * cars.length)];
      look.car = kind as CarKind;
      look.paint = CAR_PAINTS[Math.floor(rnd() * CAR_PAINTS.length)];
    } else if (r < 0.9) {
      kind = "bike";
      look.brand = brands[Math.floor(rnd() * brands.length)];
      look.delivery = !(look.brand === "grap" && rnd() < 0.4);
    } else {
      kind = "van";
      look.brand = "lalamoov";
    }
    const size = VEHICLE_SIZE[kind];
    const s = Math.min(lane.len - 10, 6 + slot * 14 + rnd() * 4);
    const p = lanePos(lane, s);
    vehicles.push({
      id: n,
      kind,
      look,
      len: size.len,
      width: size.width,
      maxSpeed: kind === "bike" ? 10 : kind === "van" ? 8 : 9,
      lane,
      s,
      speed: 0,
      turn: null,
      plan: pickNext(lane, rnd),
      x: p.x,
      z: p.z,
      rot: Math.atan2(lane.dir.x, lane.dir.z),
      stuck: 0,
      ghostUntil: 0,
      honkAt: 0,
    });
  }
  /** Junction reservations: vehicles about to enter (and inside) each box. */
  const reserved = new Map<string, Set<Vehicle>>();
  return { vehicles, rnd, reserved };
}

export type Traffic = ReturnType<typeof createTraffic>;

/** Vehicles using a junction box (inside it, or reserved to enter), with where they're headed. */
function boxUsers(tr: Traffic, node: GridNode, self: Vehicle) {
  const out: { v: Vehicle; to: Lane }[] = [];
  for (const v of tr.reserved.get(node.id) ?? []) if (v !== self) out.push({ v, to: v.turn?.to ?? v.plan });
  return out;
}

const axisOf = (l: Lane) => (l.dir.x !== 0 ? "x" : "z");
const opposite = (a: Lane, b: Lane) => a.dir.x === -b.dir.x && a.dir.z === -b.dir.z;

function canEnter(tr: Traffic, v: Vehicle, t: number, committed: boolean): boolean {
  const node = v.lane.to;
  const users = boxUsers(tr, node, v);
  // Never share the box with cross traffic
  if (users.some((u) => axisOf(u.v.lane) !== axisOf(v.lane))) return false;
  if (node.signal) {
    const light = signalFor(node, axisOf(v.lane), t);
    // Too close to stop safely? Clear the junction rather than stop on the crossing
    if (light !== "green" && !committed) return false;
    // Right turns cross oncoming traffic: never share the box with an oncoming vehicle if
    // either of us is turning right, and a right-turner waits for a gap in oncoming traffic
    const meRight = turnKind(v.lane.dir, v.plan.dir) === "right";
    if (users.some((u) => opposite(u.v.lane, v.lane) && (meRight || turnKind(u.v.lane.dir, u.to.dir) === "right"))) return false;
    if (meRight) {
      const coming = tr.vehicles.some((o) => o !== v && !o.turn && o.lane.to === node && opposite(o.lane, v.lane) && o.lane.len - o.s < 16 && o.speed > 1);
      if (coming) return false;
    }
    return true;
  }
  // Unsignalled corners and tees: one approach at a time
  return users.every((u) => u.v.lane === v.lane);
}

/**
 * Advance the simulation. `obstacles` are people (player, pedestrians) cars must not hit.
 * Returns ids of vehicles that honked this step.
 */
export function stepTraffic(tr: Traffic, dt: number, t: number, obstacles: Obstacle[]): number[] {
  const honks: number[] = [];
  const vs = tr.vehicles;
  for (const v of vs) {
    let target = v.maxSpeed;
    const fx = Math.sin(v.rot);
    const fz = Math.cos(v.rot);
    const ghost = t < v.ghostUntil;

    // Stop line / junction entry: reserve the box early enough to brake if we can't have it
    if (!v.turn) {
      const toEnd = v.lane.len - v.s;
      const stopAt = v.lane.to.signal ? v.lane.len - STOP_BACK - v.len / 2 : v.lane.len - v.len / 2 - 0.3;
      const room = stopAt - v.s;
      const committed = room < Math.min(2.5, (v.speed * v.speed) / (2 * BRAKE)) || room < -0.3;
      const set = tr.reserved.get(v.lane.to.id) ?? new Set<Vehicle>();
      tr.reserved.set(v.lane.to.id, set);
      let mine = set.has(v);
      // A reservation doesn't survive the light going red before we reach the line
      if (mine && v.lane.to.signal && !committed && signalFor(v.lane.to, axisOf(v.lane), t) === "red") {
        set.delete(v);
        mine = false;
      }
      if (!mine && toEnd < 22) {
        if (canEnter(tr, v, t, committed)) {
          if (room < 10) set.add(v);
        } else target = Math.min(target, Math.max(0, room * 1.4));
      }
      if (!mine && !set.has(v) && toEnd < 22 && room < 10) target = Math.min(target, Math.max(0, room * 1.4));
    }

    // Car-following: anything in a cone ahead
    let blockedByPerson = false;
    if (!ghost) {
      for (const o of vs) {
        if (o === v) continue;
        const dx = o.x - v.x;
        const dz = o.z - v.z;
        const ahead = dx * fx + dz * fz;
        if (ahead <= 0 || ahead > LOOK) continue;
        const lateral = Math.abs(dx * fz - dz * fx);
        if (lateral > (v.width + o.width) / 2 + 0.35) continue;
        const gap = ahead - (v.len + o.len) / 2;
        target = Math.min(target, Math.max(0, (gap - MIN_GAP) * 1.5));
      }
    }
    for (const o of obstacles) {
      const dx = o.x - v.x;
      const dz = o.z - v.z;
      const ahead = dx * fx + dz * fz;
      if (ahead <= 0 || ahead > 12) continue;
      const lateral = Math.abs(dx * fz - dz * fx);
      if (lateral > v.width / 2 + o.r + 0.4) continue;
      const gap = ahead - v.len / 2 - o.r;
      const want = Math.max(0, (gap - 1.2) * 1.6);
      if (want < target) {
        target = want;
        blockedByPerson = true;
      }
    }

    // Speed
    // Ease up to the target; brake hard when something is right in front
    v.speed = target > v.speed ? Math.min(target, v.speed + ACCEL * dt) : Math.max(target, v.speed - BRAKE * dt * (target < 1 ? 3 : 1));
    // Only a vehicle stuck inside a junction can be part of a deadlock
    if (v.turn && v.speed < 0.2) v.stuck += dt;
    else v.stuck = 0;
    if (blockedByPerson && v.stuck > 1.2 && t > v.honkAt) {
      honks.push(v.id);
      v.honkAt = t + 4 + tr.rnd() * 3;
    }
    // Deadlock breaker: after a long wait (not at a red), ignore other cars for a moment
    if (v.stuck > 5 && !blockedByPerson) {
      v.ghostUntil = t + 1.5;
      v.stuck = 0;
    }

    // Move
    let move = v.speed * dt;
    while (move > 0) {
      if (!v.turn) {
        const left = v.lane.len - v.s;
        if (move < left) {
          v.s += move;
          move = 0;
        } else {
          move -= left;
          const c = turnCurve(v.lane, v.plan);
          v.turn = { to: v.plan, at: c.at, len: c.len, s: 0 };
          v.s = v.lane.len;
        }
      } else {
        const left = v.turn.len - v.turn.s;
        if (move < left) {
          v.turn.s += move;
          move = 0;
        } else {
          move -= left;
          tr.reserved.get(v.lane.to.id)?.delete(v);
          v.lane = v.turn.to;
          v.s = 0;
          v.turn = null;
          v.plan = pickNext(v.lane, tr.rnd);
        }
      }
    }

    // Pose
    if (v.turn) {
      const k = v.turn.s / v.turn.len;
      const p = v.turn.at(k);
      const q = v.turn.at(Math.min(1, k + 0.04));
      v.x = p.x;
      v.z = p.z;
      if (Math.hypot(q.x - p.x, q.z - p.z) > 1e-4) v.rot = Math.atan2(q.x - p.x, q.z - p.z);
    } else {
      const p = lanePos(v.lane, v.s);
      v.x = p.x;
      v.z = p.z;
      v.rot = Math.atan2(v.lane.dir.x, v.lane.dir.z);
    }
  }
  return honks;
}

/** Two circles per car (front and back), one per bike, for pushing the player out. */
export function vehicleCircles(tr: Traffic) {
  const out: Obstacle[] = [];
  for (const v of tr.vehicles) {
    const fx = Math.sin(v.rot);
    const fz = Math.cos(v.rot);
    if (v.kind === "bike") out.push({ x: v.x, z: v.z, r: 0.6 });
    else {
      const off = v.len / 2 - v.width / 2;
      out.push({ x: v.x + fx * off, z: v.z + fz * off, r: v.width / 2 + 0.05 });
      out.push({ x: v.x - fx * off, z: v.z - fz * off, r: v.width / 2 + 0.05 });
      out.push({ x: v.x, z: v.z, r: v.width / 2 + 0.05 });
    }
  }
  return out;
}
