/**
 * Scripted Teksi Kumar ride: arrive → board → drive → alight on sidewalk.
 * Dedicated car instance (does not hijack traffic) — brakes for peer cars.
 */

import { emit } from "@/core/events";
import { type Lane, LANES, turnCurve } from "../plan";
import { VEHICLE_SIZE } from "../kit/vehicles";
import { TAXI_FARE_SEN, taxiDestById, type TaxiDest } from "./taxi-dests";

export type TaxiPhase = "off" | "arriving" | "boarding" | "riding" | "alighting";

export type TaxiMode = "off" | "scripted" | "riding";

type PathPt = { x: number; z: number };

/** Traffic cars the taxi must not drive through (set each frame by CityTraffic). */
export type TaxiPeer = { x: number; z: number; rot: number; len: number; width: number };

const SPEED_ARRIVE = 10;
const SPEED_RIDE = 11;
const BOARD_WALK = 2.8;
const DOOR_T = 0.75;
const SEAT_Y = 0.52;
const CURB_OUT = 1.55;
const LOOK = 14;
const MIN_GAP = 1.8;
/** Player must be this close to the kerb before the board walk starts (it ignores walls). */
const BOARD_RANGE = 6;
/** Waiting longer than this at the kerb: Kumar drives off (the hub refunds the fare). */
const WAIT_MAX = 90;
/** Blocked this long (e.g. nose to nose with cross traffic): squeeze past for a moment. */
const STUCK_MAX = 2.5;
const GHOST_FOR = 1.5;
const { width: TAXI_W, len: TAXI_LEN } = VEHICLE_SIZE.taxi;

let peers: TaxiPeer[] = [];

/** Called from CityTraffic each frame before/after step. */
export function setTaxiPeers(next: TaxiPeer[]) {
  peers = next;
}

export const taxi = {
  phase: "off" as TaxiPhase,
  destId: null as string | null,
  x: 0,
  z: 0,
  rotY: 0,
  door: 0,
  seatY: SEAT_Y,
  path: [] as PathPt[],
  pathI: 0,
  dropSidewalk: { x: 0, z: 0 },
  prompt: null as null | "arriving" | "waiting" | "boarding" | "riding" | "alighting",
  toast: null as string | null,
  /** Board: open → toCurb → toSeat → close. Alight: open → toCurb → toWalk → close. */
  boardStep: "open" as "open" | "toCurb" | "toSeat" | "close" | "toWalk",
  boardFrom: { x: 0, z: 0 },
  curbWorld: { x: 0, z: 0 },
  doorWorld: { x: 0, z: 0 },
  seatWorld: { x: 0, z: 0 },
  /** Seconds parked at the kerb waiting for the player. */
  waited: 0,
  /** Seconds blocked by a peer; past STUCK_MAX the taxi ignores peers for GHOST_FOR. */
  stuck: 0,
  ghost: 0,
};

export function taxiBusy() {
  return taxi.phase !== "off";
}

/** Circles so traffic brakes for the ride taxi (and player collides while waiting). */
export function taxiCircles(): { x: number; z: number; r: number }[] {
  if (!taxiBusy()) return [];
  const fx = Math.sin(taxi.rotY);
  const fz = Math.cos(taxi.rotY);
  const off = TAXI_LEN / 2 - TAXI_W / 2;
  const r = TAXI_W / 2 + 0.08;
  return [
    { x: taxi.x + fx * off, z: taxi.z + fz * off, r },
    { x: taxi.x - fx * off, z: taxi.z - fz * off, r },
    { x: taxi.x, z: taxi.z, r },
  ];
}

export function resetTaxi() {
  taxi.phase = "off";
  taxi.destId = null;
  taxi.door = 0;
  taxi.path = [];
  taxi.pathI = 0;
  taxi.prompt = null;
  taxi.toast = null;
  taxi.boardStep = "open";
  taxi.waited = 0;
  taxi.stuck = 0;
  taxi.ghost = 0;
}

function lanePos(l: Lane, s: number) {
  return { x: l.start.x + l.dir.x * s, z: l.start.z + l.dir.z * s };
}

export function nearestLanePoint(x: number, z: number, lanes: Lane[] = LANES) {
  let best = { lane: lanes[0]!, s: 0, x: lanes[0]!.start.x, z: lanes[0]!.start.z, dist: Infinity };
  for (const lane of lanes) {
    if (lane.len < 0.5) continue;
    const dx = lane.end.x - lane.start.x;
    const dz = lane.end.z - lane.start.z;
    let t = ((x - lane.start.x) * dx + (z - lane.start.z) * dz) / (lane.len * lane.len);
    t = Math.max(0, Math.min(1, t));
    const px = lane.start.x + dx * t;
    const pz = lane.start.z + dz * t;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) best = { lane, s: t * lane.len, x: px, z: pz, dist };
  }
  return best;
}

/** BFS lane chain from `from` to `to` (inclusive). */
export function laneChain(from: Lane, to: Lane): Lane[] | null {
  if (from.id === to.id) return [from];
  const q: Lane[] = [from];
  const prev = new Map<string, string | null>([[from.id, null]]);
  const byId = new Map<string, Lane>();
  for (const l of LANES) byId.set(l.id, l);
  while (q.length) {
    const cur = q.shift()!;
    for (const n of cur.next) {
      if (prev.has(n.id)) continue;
      prev.set(n.id, cur.id);
      if (n.id === to.id) {
        const chain: Lane[] = [n];
        let id: string | null = cur.id;
        while (id) {
          chain.push(byId.get(id)!);
          id = prev.get(id) ?? null;
        }
        chain.reverse();
        return chain;
      }
      q.push(n);
    }
  }
  return null;
}

function dedupe(pts: PathPt[]): PathPt[] {
  const out: PathPt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.15) out.push(p);
  }
  return out;
}

/** Polyline along the lane graph from A to B (nearest lane samples). */
export function buildLanePath(ax: number, az: number, bx: number, bz: number, lanes: Lane[] = LANES): PathPt[] {
  const a = nearestLanePoint(ax, az, lanes);
  const b = nearestLanePoint(bx, bz, lanes);
  const chain = laneChain(a.lane, b.lane);
  if (!chain) return dedupe([a, b]);

  const pts: PathPt[] = [{ x: a.x, z: a.z }];
  for (let i = 0; i < chain.length; i++) {
    const lane = chain[i]!;
    if (i === 0) {
      if (a.s < lane.len - 0.3) pts.push({ x: lane.end.x, z: lane.end.z });
    } else {
      const prev = chain[i - 1]!;
      const curve = turnCurve(prev, lane);
      for (let k = 1; k <= 6; k++) {
        const q = curve.at(k / 6);
        pts.push(q);
      }
      if (i < chain.length - 1) pts.push({ x: lane.end.x, z: lane.end.z });
      else pts.push({ x: b.x, z: b.z });
    }
  }
  if (chain.length === 1) {
    pts.length = 0;
    pts.push({ x: a.x, z: a.z }, { x: b.x, z: b.z });
  }
  return dedupe(pts);
}

function leftOf(rotY: number) {
  return { x: -Math.cos(rotY), z: Math.sin(rotY) };
}

function updateDoorWorld() {
  const L = leftOf(taxi.rotY);
  taxi.curbWorld = {
    x: taxi.x + L.x * CURB_OUT,
    z: taxi.z + L.z * CURB_OUT,
  };
  // Door mouth — just outside the bay so the walk enters through the open gap
  taxi.doorWorld = {
    x: taxi.x + L.x * (TAXI_W * 0.42),
    z: taxi.z + L.z * (TAXI_W * 0.42),
  };
  taxi.seatWorld = { x: taxi.x, z: taxi.z };
}

/** Cap speed so we don't rear-end traffic peers. */
function peerSpeedCap(want: number): number {
  if (taxi.ghost > 0) return want;
  const fx = Math.sin(taxi.rotY);
  const fz = Math.cos(taxi.rotY);
  let cap = want;
  for (const o of peers) {
    const dx = o.x - taxi.x;
    const dz = o.z - taxi.z;
    const ahead = dx * fx + dz * fz;
    if (ahead <= 0 || ahead > LOOK) continue;
    const lateral = Math.abs(dx * fz - dz * fx);
    if (lateral > (TAXI_W + o.width) / 2 + 0.4) continue;
    const gap = ahead - (TAXI_LEN + o.len) / 2;
    cap = Math.min(cap, Math.max(0, (gap - MIN_GAP) * 1.5));
  }
  return cap;
}

/** Pay already done — start arrive phase. */
export function startTaxiRide(destId: string, playerX: number, playerZ: number): boolean {
  if (taxi.phase !== "off") return false;
  const dest = taxiDestById(destId);
  if (!dest) return false;

  const pick = nearestLanePoint(playerX, playerZ);
  const spawnS = Math.max(1.5, pick.s - 28);
  const spawn = lanePos(pick.lane, spawnS);

  taxi.destId = destId;
  taxi.dropSidewalk = { x: dest.x, z: dest.z };
  taxi.x = spawn.x;
  taxi.z = spawn.z;
  taxi.rotY = Math.atan2(pick.lane.dir.x, pick.lane.dir.z);
  taxi.door = 0;
  taxi.path = buildLanePath(spawn.x, spawn.z, pick.x, pick.z);
  taxi.pathI = 0;
  taxi.phase = "arriving";
  taxi.prompt = "arriving";
  taxi.boardStep = "open";
  taxi.boardFrom = { x: playerX, z: playerZ };
  updateDoorWorld();
  return true;
}

export { TAXI_FARE_SEN };
export type { TaxiDest };

function advancePath(speed: number, dt: number): boolean {
  if (taxi.pathI >= taxi.path.length - 1) return true;
  taxi.ghost = Math.max(0, taxi.ghost - dt);
  const capped = peerSpeedCap(speed);
  if (capped < 0.05) {
    // Traffic yields to the taxi and the taxi yields to traffic: break a standoff
    taxi.stuck += dt;
    if (taxi.stuck > STUCK_MAX) {
      taxi.stuck = 0;
      taxi.ghost = GHOST_FOR;
    }
    updateDoorWorld();
    return false;
  }
  taxi.stuck = 0;
  let budget = capped * dt;
  while (budget > 0 && taxi.pathI < taxi.path.length - 1) {
    const a = taxi.path[taxi.pathI]!;
    const b = taxi.path[taxi.pathI + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz) || 0.001;
    const along = Math.hypot(taxi.x - a.x, taxi.z - a.z);
    const remain = Math.max(0, segLen - along);
    if (budget >= remain - 0.01) {
      taxi.x = b.x;
      taxi.z = b.z;
      taxi.rotY = Math.atan2(dx, dz);
      taxi.pathI += 1;
      budget -= remain;
    } else {
      const t = (along + budget) / segLen;
      taxi.x = a.x + dx * t;
      taxi.z = a.z + dz * t;
      taxi.rotY = Math.atan2(dx, dz);
      budget = 0;
    }
  }
  updateDoorWorld();
  return taxi.pathI >= taxi.path.length - 1;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function walkToward(refs: TaxiRefs, tx: number, tz: number, dt: number, stopAt: number): boolean {
  const dx = tx - refs.p.x;
  const dz = tz - refs.p.z;
  const d = Math.hypot(dx, dz);
  if (d <= stopAt) return true;
  const step = Math.min(BOARD_WALK * dt, d - stopAt * 0.5);
  refs.p.x += (dx / d) * step;
  refs.p.z += (dz / d) * step;
  refs.rot.current = Math.atan2(dx, dz);
  refs.moving.current = true;
  return false;
}

export type TaxiRefs = {
  p: { x: number; z: number };
  rot: { current: number };
  moving: { current: boolean };
  seated: { current: boolean };
  floorY: { current: number };
  stride: { current: { dist: number; alt: boolean } };
};

/**
 * Advance taxi session. Returns control mode for the city player.
 * When not `off`, the player should not free-walk.
 */
export function tickTaxiRide(refs: TaxiRefs, dt: number): TaxiMode {
  if (taxi.phase === "off") return "off";

  if (taxi.phase === "arriving") {
    taxi.prompt = "arriving";
    const done = advancePath(SPEED_ARRIVE, dt);
    if (done) {
      // Parked: wait until the player is back at the kerb (the board walk ignores walls)
      if (Math.hypot(refs.p.x - taxi.curbWorld.x, refs.p.z - taxi.curbWorld.z) > BOARD_RANGE) {
        taxi.prompt = "waiting";
        taxi.waited += dt;
        if (taxi.waited > WAIT_MAX) {
          resetTaxi();
          taxi.toast = "missed";
        }
        return "off";
      }
      taxi.phase = "boarding";
      taxi.prompt = "boarding";
      taxi.door = 0;
      taxi.boardStep = "open";
      taxi.boardFrom = { x: refs.p.x, z: refs.p.z };
      updateDoorWorld();
      return "scripted";
    }
    return "off";
  }

  if (taxi.phase === "boarding") {
    taxi.prompt = "boarding";
    updateDoorWorld();
    if (taxi.boardStep === "open") {
      // Open door while player walks to the kerb stand
      taxi.door = Math.min(1, taxi.door + dt / DOOR_T);
      refs.seated.current = false;
      refs.floorY.current = 0;
      const atCurb = walkToward(refs, taxi.curbWorld.x, taxi.curbWorld.z, dt, 0.28);
      if (!atCurb) return "scripted";
      refs.moving.current = false;
      if (taxi.door >= 1) taxi.boardStep = "toCurb";
      return "scripted";
    }
    if (taxi.boardStep === "toCurb") {
      // Brief beat at open door, then step through the bay
      refs.seated.current = false;
      refs.floorY.current = 0;
      const atDoor = walkToward(refs, taxi.doorWorld.x, taxi.doorWorld.z, dt, 0.22);
      if (!atDoor) return "scripted";
      taxi.boardStep = "toSeat";
    }
    if (taxi.boardStep === "toSeat") {
      const atSeat = walkToward(refs, taxi.seatWorld.x, taxi.seatWorld.z, dt, 0.16);
      refs.seated.current = false;
      refs.floorY.current = lerp(0, SEAT_Y, Math.min(1, 1 - Math.hypot(refs.p.x - taxi.x, refs.p.z - taxi.z) / 2));
      if (!atSeat) return "scripted";
      refs.p.x = taxi.x;
      refs.p.z = taxi.z;
      refs.rot.current = taxi.rotY;
      refs.seated.current = true;
      refs.moving.current = false;
      refs.floorY.current = SEAT_Y;
      taxi.boardStep = "close";
    }
    refs.p.x = taxi.x;
    refs.p.z = taxi.z;
    refs.rot.current = taxi.rotY;
    refs.seated.current = true;
    refs.moving.current = false;
    refs.floorY.current = SEAT_Y;
    if (taxi.door > 0) {
      taxi.door = Math.max(0, taxi.door - dt / DOOR_T);
      return "scripted";
    }
    const dropLane = nearestLanePoint(taxi.dropSidewalk.x, taxi.dropSidewalk.z);
    taxi.path = buildLanePath(taxi.x, taxi.z, dropLane.x, dropLane.z);
    taxi.pathI = 0;
    taxi.phase = "riding";
    taxi.prompt = "riding";
    return "riding";
  }

  if (taxi.phase === "riding") {
    taxi.prompt = "riding";
    const done = advancePath(SPEED_RIDE, dt);
    refs.p.x = taxi.x;
    refs.p.z = taxi.z;
    refs.rot.current = taxi.rotY;
    refs.seated.current = true;
    refs.moving.current = false;
    refs.floorY.current = SEAT_Y;
    if (done) {
      taxi.phase = "alighting";
      taxi.prompt = "alighting";
      taxi.door = 0;
      taxi.boardStep = "open";
      updateDoorWorld();
    }
    return "riding";
  }

  if (taxi.phase === "alighting") {
    taxi.prompt = "alighting";
    updateDoorWorld();
    if (taxi.boardStep === "open") {
      taxi.door = Math.min(1, taxi.door + dt / DOOR_T);
      refs.seated.current = true;
      refs.moving.current = false;
      refs.p.x = taxi.x;
      refs.p.z = taxi.z;
      refs.floorY.current = SEAT_Y;
      if (taxi.door >= 1) taxi.boardStep = "toCurb";
      return "scripted";
    }
    if (taxi.boardStep === "toCurb") {
      refs.seated.current = false;
      refs.floorY.current = lerp(SEAT_Y, 0, 0.5);
      const atCurb = walkToward(refs, taxi.curbWorld.x, taxi.curbWorld.z, dt, 0.28);
      if (!atCurb) return "scripted";
      refs.floorY.current = 0;
      taxi.boardStep = "toWalk";
    }
    if (taxi.boardStep === "toWalk") {
      refs.seated.current = false;
      refs.floorY.current = 0;
      const atWalk = walkToward(refs, taxi.dropSidewalk.x, taxi.dropSidewalk.z, dt, 0.3);
      if (!atWalk) return "scripted";
      refs.p.x = taxi.dropSidewalk.x;
      refs.p.z = taxi.dropSidewalk.z;
      refs.moving.current = false;
      taxi.boardStep = "close";
    }
    if (taxi.door > 0) {
      taxi.door = Math.max(0, taxi.door - dt / DOOR_T);
      return "scripted";
    }
    const destId = taxi.destId ?? "";
    emit({ type: "tookTaxi", to: destId });
    resetTaxi();
    taxi.toast = `arrived:${destId}`;
    return "off";
  }

  return "off";
}
