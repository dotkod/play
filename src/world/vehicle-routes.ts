/**
 * City-wide vehicle lanes from ROAD_STRIPS.
 * Strip ends link to other strips at junctions so traffic can turn — not only U-turn.
 */

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

function buildLanes(): VehicleLane[] {
  const out: VehicleLane[] = [];
  ROAD_STRIPS.forEach((s, i) => {
    const span = stripSpan(s);
    // Keep arterials busy but not packed — overcrowding causes stacking at ends
    const perDir = span > 100 ? 3 : span > 50 ? 2 : span > 25 ? 1 : 1;
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

/**
 * Pick next lane at strip end: prefer turns onto other strips (70%), else U-turn.
 * Keeps traffic circulating through the city instead of bouncing forever on one road.
 */
export function pickNextLane(lane: VehicleLane): LaneHop {
  const hops = LANE_HOPS[lane.id] ?? [];
  const turns = hops.filter((h) => {
    const t = VEHICLE_LANES.find((l) => l.id === h.laneId);
    return t && t.strip !== lane.strip;
  });
  const uturn = hops.find((h) => {
    const t = VEHICLE_LANES.find((l) => l.id === h.laneId);
    return t && t.strip === lane.strip;
  });
  if (turns.length && Math.random() < 0.72) {
    return turns[Math.floor(Math.random() * turns.length)];
  }
  if (uturn) return uturn;
  if (turns.length) return turns[Math.floor(Math.random() * turns.length)];
  const back = reverseLane(lane);
  return { laneId: back.id, entryS: 3 };
}
