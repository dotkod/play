/**
 * City-wide vehicle lanes built from ROAD_STRIPS (same corridors as the map / 3D asphalt).
 * Each strip yields two directed left-hand lanes; cars ping-pong or continue at ends.
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
    // More cars on long arterials, fewer on short branches
    const perDir = span > 80 ? 5 : span > 40 ? 3 : span > 20 ? 2 : 1;
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

/** Point + heading at distance `s` along a lane (0 .. length). */
export function pointOnLane(lane: VehicleLane, s: number) {
  const t = lane.length < 1e-6 ? 0 : Math.max(0, Math.min(1, s / lane.length));
  const x = lane.a.x + (lane.b.x - lane.a.x) * t;
  const z = lane.a.z + (lane.b.z - lane.a.z) * t;
  const rotY = Math.atan2(lane.b.x - lane.a.x, lane.b.z - lane.a.z);
  return { x, z, rotY };
}

/** Opposite direction on the same strip (for ping-pong at ends). */
export function reverseLane(lane: VehicleLane): VehicleLane {
  const twin = VEHICLE_LANES.find((l) => l.strip === lane.strip && l.dir === -lane.dir);
  return twin ?? lane;
}
