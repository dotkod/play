/**
 * LRT colliders. Street-level shapes are safe to merge into the city plan (xz).
 * Elevated shapes are applied only while the player is on the deck / apron.
 */

import { DOOR_HALF, PLAT_BACK_Z, PLAT_EDGE_Z, PLATFORM_ALONG, TRACK_Z, TRAIN_LEN, TRAIN_WIDTH } from "./constants";
import { PATH_MAX_X, PATH_MIN_X } from "./path";
import { STATIONS, rect, type Rect } from "./stations";

export type BoxCollider = { id: string; rect: Rect };
export type CircleCollider = { id: string; x: number; z: number; r: number };

/** Plaza canopy, lift shaft walls — street solids only (never on asphalt). */
export function streetLevelColliders(): { boxes: BoxCollider[]; circles: CircleCollider[] } {
  const boxes: BoxCollider[] = [];
  const circles: CircleCollider[] = [];
  for (const st of STATIONS) {
    const canopyZ1 = (st.street.minZ + st.street.maxZ) / 2;
    boxes.push({
      id: `${st.id}-canopy-sides-w`,
      rect: rect(st.street.minX - 0.2, st.street.minX + 0.2, st.street.minZ, canopyZ1),
    });
    boxes.push({
      id: `${st.id}-canopy-sides-e`,
      rect: rect(st.street.maxX - 0.2, st.street.maxX + 0.2, st.street.minZ, canopyZ1),
    });
    st.serviceBoxes.forEach((r, i) => {
      boxes.push({ id: `${st.id}-shaft-${i}`, rect: r });
    });
  }
  const step = 18;
  for (let x = PATH_MIN_X + 6; x < PATH_MAX_X; x += step) {
    circles.push({ id: `lrt-pillar-${x}`, x, z: TRACK_Z, r: 0.55 });
  }
  return { boxes, circles };
}

/** Platform walls / furniture / inter-station guide rails — only when elevated. */
export function elevatedColliders(): BoxCollider[] {
  const boxes: BoxCollider[] = [];
  for (const st of STATIONS) {
    const half = PLATFORM_ALONG / 2;
    const platZ0 = PLAT_EDGE_Z;
    const platZ1 = PLAT_BACK_Z;
    boxes.push({ id: `${st.id}-wall-w`, rect: rect(st.x - half - 0.35, st.x - half, platZ0, st.concourse.maxZ) });
    boxes.push({ id: `${st.id}-wall-e`, rect: rect(st.x + half, st.x + half + 0.35, platZ0, st.concourse.maxZ) });
    boxes.push({ id: `${st.id}-plat-end-w`, rect: rect(st.x - half - 0.05, st.x - half + 0.2, platZ0, platZ1) });
    boxes.push({ id: `${st.id}-plat-end-e`, rect: rect(st.x + half - 0.2, st.x + half + 0.05, platZ0, platZ1) });
    boxes.push({
      id: `${st.id}-plat-back-w`,
      rect: rect(st.x - half, st.concourse.minX, platZ1 - 0.12, platZ1 + 0.25),
    });
    boxes.push({
      id: `${st.id}-plat-back-e`,
      rect: rect(st.concourse.maxX, st.x + half, platZ1 - 0.12, platZ1 + 0.25),
    });
    st.furniture.forEach((r, i) => {
      boxes.push({ id: `${st.id}-furn-${i}`, rect: r });
    });
    st.fareBarriers.forEach((r, i) => {
      boxes.push({ id: `${st.id}-fare-${i}`, rect: r });
    });
    boxes.push({
      id: `${st.id}-entry-flap`,
      rect: rect(st.entryGate.x - 0.55, st.entryGate.x + 0.55, st.entryGate.z - 0.2, st.entryGate.z + 0.2),
    });
    boxes.push({
      id: `${st.id}-exit-flap`,
      rect: rect(st.exitGate.x - 0.55, st.exitGate.x + 0.55, st.exitGate.z - 0.2, st.exitGate.z + 0.2),
    });
  }
  const z0 = TRACK_Z - TRAIN_WIDTH / 2 - 0.4;
  const z1 = TRACK_Z + TRAIN_WIDTH / 2 + 0.4;
  const xs = [PATH_MIN_X, ...STATIONS.map((s) => s.x - PLATFORM_ALONG / 2 - 2), ...STATIONS.map((s) => s.x + PLATFORM_ALONG / 2 + 2), PATH_MAX_X].sort(
    (a, b) => a - b,
  );
  const cuts = [...new Set(xs)];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    if (b - a < 4) continue;
    const hitsStation = STATIONS.some((st) => a < st.x + PLATFORM_ALONG / 2 && b > st.x - PLATFORM_ALONG / 2);
    if (hitsStation) continue;
    boxes.push({ id: `guide-rail-n-${i}`, rect: rect(a, b, z0 - 0.3, z0) });
    boxes.push({ id: `guide-rail-s-${i}`, rect: rect(a, b, z1, z1 + 0.3) });
  }
  return boxes;
}

export function buildStaticColliders() {
  const street = streetLevelColliders();
  return {
    boxes: [...street.boxes, ...elevatedColliders()],
    circles: street.circles,
  };
}

/** Full set (sandbox player). */
export const STATIC_COLLIDERS = buildStaticColliders();

/** Street-only (merged into city COLLIDERS). */
export const STREET_COLLIDERS = streetLevelColliders();

export function trainFootprint(x: number, z: number): Rect {
  return rect(x - TRAIN_LEN / 2, x + TRAIN_LEN / 2, z - TRAIN_WIDTH / 2, z + TRAIN_WIDTH / 2);
}

export function trainDoorGap(x: number, z: number): Rect {
  return rect(x - DOOR_HALF, x + DOOR_HALF, z + TRAIN_WIDTH / 2 - 0.15, z + TRAIN_WIDTH / 2 + 1.2);
}
