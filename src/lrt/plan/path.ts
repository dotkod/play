/**
 * Straight elevated guideway along +x. Distance s=0 is the western end (Utara beyond).
 */

import { STATION_GAP, TRACK_Z } from "./constants";

/** Half-length past the outer stations so the train can approach cleanly. */
const PAD = 22;

export type PathSample = { x: number; z: number; rotY: number; s: number };

/** Western tip → eastern tip. */
export const PATH_MIN_X = -STATION_GAP - PAD;
export const PATH_MAX_X = STATION_GAP + PAD;
export const PATH_LENGTH = PATH_MAX_X - PATH_MIN_X;

/** Station centreline distances along the path. */
export function stationS(index: number) {
  return PAD + index * STATION_GAP;
}

export function samplePath(s: number): PathSample {
  const clamped = Math.max(0, Math.min(PATH_LENGTH, s));
  const x = PATH_MIN_X + clamped;
  // Facing east when travelling increasing s; caller flips for westbound.
  // z must match TRACK_Z / stations / guideway — never hardcode 0 (cuts the city).
  return { x, z: TRACK_Z, rotY: Math.PI / 2, s: clamped };
}

export function xToS(x: number) {
  return Math.max(0, Math.min(PATH_LENGTH, x - PATH_MIN_X));
}
