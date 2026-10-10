/**
 * Traffic lanes. Every road segment carries one lane each way, on the left (Malaysia).
 * Lanes start and end at the junction box edges; a turn joins one lane's end to the next
 * lane's start with a quadratic curve through the box.
 */

import { type Grid, type GridNode, LANE_W, ROAD_HALF, type RoadSegment } from "./grid";
import { type Dir, leftOf } from "./props";

export type P = { x: number; z: number };

export type Lane = {
  id: string;
  seg: RoadSegment;
  dir: Dir;
  from: GridNode;
  to: GridNode;
  start: P;
  end: P;
  len: number;
  /** Lanes you can continue onto at `to` (never a U-turn unless it's a dead end). */
  next: Lane[];
};

/** Distance from the lane end back to the stop line (signalled junctions). */
export const STOP_BACK = 4.1;

export function makeLanes(grid: Grid): Lane[] {
  const lanes: Lane[] = [];
  for (const seg of grid.segments) {
    for (const [from, to] of [
      [seg.a, seg.b],
      [seg.b, seg.a],
    ] as const) {
      const dx = Math.sign(to.x - from.x);
      const dz = Math.sign(to.z - from.z);
      const dir = { x: dx, z: dz };
      const l = leftOf(dir);
      const off = LANE_W / 2;
      const start = { x: from.x + dx * ROAD_HALF + l.x * off, z: from.z + dz * ROAD_HALF + l.z * off };
      const end = { x: to.x - dx * ROAD_HALF + l.x * off, z: to.z - dz * ROAD_HALF + l.z * off };
      lanes.push({ id: `${seg.id}:${from.id}>${to.id}`, seg, dir, from, to, start, end, len: Math.hypot(end.x - start.x, end.z - start.z), next: [] });
    }
  }
  for (const lane of lanes) {
    const out = lanes.filter((o) => o.from === lane.to && o.to !== lane.from);
    lane.next = out.length ? out : lanes.filter((o) => o.from === lane.to);
  }
  return lanes;
}

export type Turn = "straight" | "left" | "right" | "uturn";

export function turnKind(a: Dir, b: Dir): Turn {
  const cross = a.x * b.z - a.z * b.x;
  const dot = a.x * b.x + a.z * b.z;
  if (dot > 0.5) return "straight";
  if (dot < -0.5) return "uturn";
  // x east, z south: turning from east-bound to north-bound (cross < 0) is a left turn
  return cross < 0 ? "left" : "right";
}

/** Quadratic Bézier through the junction box from `a.end` to `b.start`. */
export function turnCurve(a: Lane, b: Lane) {
  const p0 = a.end;
  const p2 = b.start;
  let c: P;
  if (turnKind(a.dir, b.dir) === "straight" || turnKind(a.dir, b.dir) === "uturn") c = { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 };
  // Corner where the two lane lines cross
  else c = a.dir.x !== 0 ? { x: p2.x, z: p0.z } : { x: p0.x, z: p2.z };
  const at = (t: number): P => {
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, z: u * u * p0.z + 2 * u * t * c.z + t * t * p2.z };
  };
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 12; i++) {
    const q = at(i / 12);
    len += Math.hypot(q.x - prev.x, q.z - prev.z);
    prev = q;
  }
  return { at, len: Math.max(len, 0.5) };
}
