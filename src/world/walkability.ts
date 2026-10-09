/**
 * Where the player may stand. Road + roadside (WALK_HALF), pedestrian alleys,
 * parking lots, and a few plazas. Everything else is grass / off-limits.
 */

import { PARKING_LOTS } from "./parking-lots";
import { ROAD_HALF, WALK_HALF } from "./districts/pusat-lepak/layout";
import { PLAYGROUND } from "./districts/taman-ceria/layout";
import {
  ROAD_STRIP_JOIN,
  ROAD_STRIPS,
  stripLength,
  WALK_PATH_HALF,
  WALK_PATHS,
  WALK_STRIP_JOIN,
  type RoadStrip,
} from "./walk-spine";

export type WalkPlaza = { x: number; z: number; w: number; d: number };

/** Extra paved plazas not covered by road corridors. */
export const WALK_PLAZAS: WalkPlaza[] = [
  { x: -28, z: 22, w: 12, d: 12 }, // Masjid Lepak courtyard
  { x: PLAYGROUND.x, z: PLAYGROUND.z, w: PLAYGROUND.w + 2, d: PLAYGROUND.d + 2 },
  { x: 28, z: -16, w: 10, d: 6 }, // Petaling north mouth plaza
  { x: 28, z: -42, w: 8, d: 5 }, // Petaling south end
  { x: 0, z: 60, w: 18, d: 18 }, // Pasar market pad between halls (not a giant underlay)
];

function onStrip(x: number, z: number, s: RoadStrip, half: number, join: number) {
  if (s.axis === "x") {
    return Math.abs(z - s.z) <= half && x >= s.x0 - join && x <= s.x1 + join;
  }
  return Math.abs(x - s.x) <= half && z >= s.z0 - join && z <= s.z1 + join;
}

function walkHalfForStrip(s: RoadStrip) {
  return stripLength(s) < 16 ? ROAD_HALF + 1.4 : WALK_HALF;
}

export function isWalkable(x: number, z: number) {
  for (const s of ROAD_STRIPS) {
    // Carriageway + roadside verge (default walkable) — match CityRoadStrips
    if (onStrip(x, z, s, walkHalfForStrip(s) + 0.25, WALK_STRIP_JOIN + 0.4)) return true;
  }
  for (const s of WALK_PATHS) {
    if (onStrip(x, z, s, WALK_PATH_HALF + 0.2, 0.6)) return true;
  }
  for (const lot of PARKING_LOTS) {
    if (Math.abs(x - lot.x) <= lot.w / 2 + 0.15 && Math.abs(z - lot.z) <= lot.d / 2 + 0.9) return true;
  }
  for (const p of WALK_PLAZAS) {
    if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) return true;
  }
  return false;
}

/** Closest point on a strip centreline (for tap-to-walk on grass). */
function closestOnStrip(x: number, z: number, s: RoadStrip): { x: number; z: number; d: number } {
  if (s.axis === "x") {
    const px = Math.min(s.x1, Math.max(s.x0, x));
    return { x: px, z: s.z, d: Math.hypot(x - px, z - s.z) };
  }
  const pz = Math.min(s.z1, Math.max(s.z0, z));
  return { x: s.x, z: pz, d: Math.hypot(x - s.x, z - pz) };
}

/** If (x,z) is off-path, snap to nearest road/path centreline within maxDist. */
export function snapToWalkable(x: number, z: number, maxDist = 14): { x: number; z: number } | null {
  if (isWalkable(x, z)) return { x, z };
  let bestX = x;
  let bestZ = z;
  let bestD = Infinity;
  const consider = (hx: number, hz: number, d: number) => {
    if (d < bestD) {
      bestD = d;
      bestX = hx;
      bestZ = hz;
    }
  };
  for (const s of ROAD_STRIPS) {
    const hit = closestOnStrip(x, z, s);
    consider(hit.x, hit.z, hit.d);
  }
  for (const s of WALK_PATHS) {
    const hit = closestOnStrip(x, z, s);
    consider(hit.x, hit.z, hit.d);
  }
  for (const lot of PARKING_LOTS) {
    const px = Math.min(lot.x + lot.w / 2, Math.max(lot.x - lot.w / 2, x));
    const pz = Math.min(lot.z + lot.d / 2, Math.max(lot.z - lot.d / 2, z));
    consider(px, pz, Math.hypot(x - px, z - pz));
  }
  for (const p of WALK_PLAZAS) {
    const px = Math.min(p.x + p.w / 2, Math.max(p.x - p.w / 2, x));
    const pz = Math.min(p.z + p.d / 2, Math.max(p.z - p.d / 2, z));
    consider(px, pz, Math.hypot(x - px, z - pz));
  }
  if (bestD > maxDist) return null;
  return { x: bestX, z: bestZ };
}

/** True if standing on asphalt (not just sidewalk) — optional SFX later. */
export function onAsphalt(x: number, z: number) {
  for (const s of ROAD_STRIPS) {
    if (onStrip(x, z, s, ROAD_HALF + 0.15, ROAD_STRIP_JOIN)) return true;
  }
  return false;
}
