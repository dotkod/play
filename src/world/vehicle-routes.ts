/**
 * City-wide vehicle lanes from ROAD_STRIPS.
 * Strip ends link to other strips at junctions so traffic can turn — not only U-turn.
 */

import { PARKING_LOTS } from "./parking-lots";
import { ROAD_STRIPS, type RoadStrip } from "./walk-spine";

export type VehicleLane = {
  id: string;
  /** Strip index in ROAD_STRIPS */
  strip: number;
  axis: "x" | "z";
  /** +1 travels toward higher coord on the strip axis */
  dir: 1 | -1;
  /** World positions along the lane (start → end) */
  a: { x: number; z: number };
  b: { x: number; z: number };
  length: number;
  /** How many vehicles to seed on this lane */
  capacity: number;
};

const LANE = 1.5;
/** How close two lane endpoints must be to count as a junction hop. */
const JOIN_R = 5.5;

function stripSpan(s: RoadStrip) {
  if (s.axis === "x") return Math.abs(s.x1 - s.x0);
  return Math.abs(s.z1 - s.z0);
}

function laneEnds(s: RoadStrip, dir: 1 | -1): { a: { x: number; z: number }; b: { x: number; z: number } } {
  // Left-hand: facing +axis, offset is -perp; facing -axis, offset is +perp
  if (s.axis === "x") {
    const z = -dir * LANE + s.z;
    const x0 = Math.min(s.x0, s.x1);
    const x1 = Math.max(s.x0, s.x1);
    return dir > 0
      ? { a: { x: x0, z }, b: { x: x1, z } }
      : { a: { x: x1, z }, b: { x: x0, z } };
  }
  const x = dir * LANE + s.x;
  const z0 = Math.min(s.z0, s.z1);
  const z1 = Math.max(s.z0, s.z1);
  return dir > 0
    ? { a: { x, z: z0 }, b: { x, z: z1 } }
    : { a: { x, z: z1 }, b: { x, z: z0 } };
}

/** True if this asphalt strip is only a parking driveway (map paint OK, no city traffic). */
function isParkingDrive(s: RoadStrip) {
  for (const lot of PARKING_LOTS) {
    const d = lot.drive;
    if (s.axis !== d.axis) continue;
    if (s.axis === "z" && d.axis === "z") {
      if (Math.abs(s.x - d.x0) > 0.6) continue;
      const a0 = Math.min(s.z0, s.z1);
      const a1 = Math.max(s.z0, s.z1);
      const b0 = Math.min(d.z0, d.z1);
      const b1 = Math.max(d.z0, d.z1);
      if (a0 <= b1 + 0.5 && b0 <= a1 + 0.5) return true;
    } else if (s.axis === "x" && d.axis === "x") {
      if (Math.abs(s.z - d.z0) > 0.6) continue;
      const a0 = Math.min(s.x0, s.x1);
      const a1 = Math.max(s.x0, s.x1);
      const b0 = Math.min(d.x0, d.x1);
      const b1 = Math.max(d.x0, d.x1);
      if (a0 <= b1 + 0.5 && b0 <= a1 + 0.5) return true;
    }
  }
  return false;
}

function buildLanes(): VehicleLane[] {
  const out: VehicleLane[] = [];
  ROAD_STRIPS.forEach((s, i) => {
    // Driveways stay on the map / walk spine but city traffic must not peel into lots
    if (isParkingDrive(s)) return;
    const span = stripSpan(s);
    // Keep arterials flowing — fewer cars = less junction stacking / overlap.
    // Tiny stubs stay empty (cars still hop onto them at junctions if useful).
    const perDir = span > 120 ? 3 : span > 70 ? 2 : span > 42 ? 1 : 0;
    for (const dir of [1, -1] as const) {
      const { a, b } = laneEnds(s, dir);
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      out.push({
        id: `strip-${i}-${dir > 0 ? "fwd" : "rev"}`,
        strip: i,
        axis: s.axis,
        dir,
        a,
        b,
        length,
        capacity: perDir,
      });
    }
  });
  return out;
}

export const VEHICLE_LANES = buildLanes();

/** Outbound hops from the end of a lane (other lanes whose start is near this end). */
export type LaneHop = { laneId: string; entryS: number };

function buildHops(): Record<string, LaneHop[]> {
  const hops: Record<string, LaneHop[]> = {};
  for (const from of VEHICLE_LANES) {
    const list: LaneHop[] = [];
    for (const to of VEHICLE_LANES) {
      if (to.id === from.id) continue;
      // Same strip reverse is always available (U-turn)
      if (to.strip === from.strip && to.dir === -from.dir) {
        list.push({ laneId: to.id, entryS: 3 });
        continue;
      }
      // Junction: end of `from` near start of `to`
      const d = Math.hypot(from.b.x - to.a.x, from.b.z - to.a.z);
      if (d < JOIN_R) list.push({ laneId: to.id, entryS: 2 + d * 0.15 });
    }
    hops[from.id] = list;
  }
  return hops;
}

const LANE_HOPS = buildHops();

/** Point + heading at distance `s` along a lane (0 .. length). */
export function pointOnLane(lane: VehicleLane, s: number) {
  const t = lane.length < 1e-6 ? 0 : Math.max(0, Math.min(1, s / lane.length));
  const x = lane.a.x + (lane.b.x - lane.a.x) * t;
  const z = lane.a.z + (lane.b.z - lane.a.z) * t;
  const rotY = Math.atan2(lane.b.x - lane.a.x, lane.b.z - lane.a.z);
  return { x, z, rotY };
}

/** Opposite direction on the same strip (fallback). */
export function reverseLane(lane: VehicleLane): VehicleLane {
  const twin = VEHICLE_LANES.find((l) => l.strip === lane.strip && l.dir === -lane.dir);
  return twin ?? lane;
}

function laneById(id: string) {
  return VEHICLE_LANES.find((l) => l.id === id);
}

/** Prefer turns onto roads that themselves connect elsewhere — never pour traffic into stubs / parking drives. */
function isUsefulTurn(hop: LaneHop) {
  const t = laneById(hop.laneId);
  // Parking driveways & dead-end aprons are short; keep city cars on real arterials
  if (!t || t.length < 22) return false;
  const next = LANE_HOPS[t.id] ?? [];
  return next.some((h) => {
    const o = laneById(h.laneId);
    return o && o.strip !== t.strip && o.length >= 22;
  });
}

/**
 * Pick next lane at strip end: prefer turns onto other strips (~88%), U-turn last.
 * Constant U-turns mid-city read as cars reversing. Parking stubs stay off-limits.
 */
export function pickNextLane(lane: VehicleLane): LaneHop {
  const hops = LANE_HOPS[lane.id] ?? [];
  const useful = hops.filter((h) => {
    const t = laneById(h.laneId);
    return t && t.strip !== lane.strip && isUsefulTurn(h);
  });
  const uturn = hops.find((h) => {
    const t = laneById(h.laneId);
    return t && t.strip === lane.strip;
  });
  if (useful.length && Math.random() < 0.88) {
    return useful[Math.floor(Math.random() * useful.length)];
  }
  if (useful.length) return useful[Math.floor(Math.random() * useful.length)];
  if (uturn) return uturn;
  const back = reverseLane(lane);
  return { laneId: back.id, entryS: 4 };
}
