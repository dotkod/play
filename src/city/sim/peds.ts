/**
 * Pedestrians walk loops around each block on the sidewalk, between the shopfronts and the
 * kerb-side lamps and trees. Each direction keeps to its own side of the path, so people
 * pass instead of walking through each other, and they wait if someone (or you) is in front.
 */

import { type Grid, grow, type Rect } from "../plan/grid";
import { seeded } from "../plan/lots";
import type { Townsfolk } from "@/shared/three/look";

/** Path distance from the building line, out into the sidewalk. */
export const PED_PATH = 2.4;
/** Each walking direction keeps this far either side of the path. */
export const PED_SIDE = 0.35;
export const PED_R = 0.3;

export type Ped = {
  id: number;
  kind: Townsfolk;
  loop: Rect;
  perimeter: number;
  s: number;
  dir: 1 | -1;
  speed: number;
  walking: boolean;
  x: number;
  z: number;
  rot: number;
};

const KINDS: { kind: Townsfolk; speed: [number, number] }[] = [
  { kind: "office", speed: [1.3, 1.6] },
  { kind: "student", speed: [1.2, 1.5] },
  { kind: "auntie", speed: [0.9, 1.1] },
  { kind: "office", speed: [1.3, 1.6] },
  { kind: "elder", speed: [0.7, 0.9] },
  { kind: "jogger", speed: [2.4, 2.8] },
  { kind: "umbrella", speed: [1.1, 1.3] },
  { kind: "kid", speed: [1.3, 1.6] },
];

function perimeterOf(r: Rect) {
  return 2 * (r.maxX - r.minX + (r.maxZ - r.minZ));
}

/** Point on a rectangle's outline at distance s (clockwise from the NW corner) plus heading. */
export function onLoop(r: Rect, s: number) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  const p = ((s % (2 * (w + d))) + 2 * (w + d)) % (2 * (w + d));
  if (p < w) return { x: r.minX + p, z: r.minZ, hx: 1, hz: 0 };
  if (p < w + d) return { x: r.maxX, z: r.minZ + (p - w), hx: 0, hz: 1 };
  if (p < 2 * w + d) return { x: r.maxX - (p - w - d), z: r.maxZ, hx: -1, hz: 0 };
  return { x: r.minX, z: r.maxZ - (p - 2 * w - d), hx: 0, hz: -1 };
}

export function createPeds(grid: Grid, count: number, seed = 5): Ped[] {
  const rnd = seeded(seed);
  const loops = grid.blocks.map((b) => grow(b.lot, PED_PATH));
  const peds: Ped[] = [];
  for (let i = 0; i < count; i++) {
    const loop = loops[i % loops.length];
    const c = KINDS[i % KINDS.length];
    const perimeter = perimeterOf(loop);
    const dir = rnd() < 0.5 ? 1 : -1;
    peds.push({
      id: i,
      kind: c.kind,
      loop,
      perimeter,
      s: (perimeter * (Math.floor(i / loops.length) * 0.5 + rnd() * 0.3)) % perimeter,
      dir,
      speed: c.speed[0] + rnd() * (c.speed[1] - c.speed[0]),
      walking: true,
      x: 0,
      z: 0,
      rot: 0,
    });
  }
  for (const p of peds) place(p);
  return peds;
}

function place(p: Ped) {
  const q = onLoop(p.loop, p.s);
  const hx = q.hx * p.dir;
  const hz = q.hz * p.dir;
  // Keep left of travel (same as the roads), so the two directions never meet head-on
  p.x = q.x + hz * PED_SIDE;
  p.z = q.z - hx * PED_SIDE;
  p.rot = Math.atan2(hx, hz);
}

export function stepPeds(peds: Ped[], dt: number, others: { x: number; z: number; r: number }[]) {
  for (const p of peds) {
    const fx = Math.sin(p.rot);
    const fz = Math.cos(p.rot);
    let blocked = false;
    const check = (x: number, z: number, r: number) => {
      const dx = x - p.x;
      const dz = z - p.z;
      const ahead = dx * fx + dz * fz;
      if (ahead <= 0 || ahead > 1.6 + r) return;
      if (Math.abs(dx * fz - dz * fx) < PED_R + r + 0.1) blocked = true;
    };
    for (const o of peds) if (o !== p) check(o.x, o.z, PED_R);
    for (const o of others) check(o.x, o.z, o.r);
    p.walking = !blocked;
    if (!blocked) p.s = (p.s + p.dir * p.speed * dt + p.perimeter) % p.perimeter;
    place(p);
  }
}
