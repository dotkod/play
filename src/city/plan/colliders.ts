/**
 * Static collision shapes, generated from the same buildings and props that are drawn.
 * Boxes for walls and furniture, circles for poles, trunks and the fountain.
 */

import { ARCADE, type CityBuilding } from "./lots";
import { rect, type Rect } from "./grid";
import { backBlock, roomColliders } from "./mamak";
import { type Prop, PROP_SIZE, type Signal } from "./props";

export type BoxCollider = { id: string; rect: Rect };
export type CircleCollider = { id: string; x: number; z: number; r: number };
export type Colliders = { boxes: BoxCollider[]; circles: CircleCollider[] };

/** Walls behind the five-foot way; the arcade itself stays open, with pillars along its edge. */
export function buildingWalls(b: CityBuilding): Rect {
  const r = b.rect;
  if (!b.arcade) return r;
  switch (b.facing) {
    case "n":
      return { ...r, minZ: r.minZ + ARCADE };
    case "s":
      return { ...r, maxZ: r.maxZ - ARCADE };
    case "w":
      return { ...r, minX: r.minX + ARCADE };
    case "e":
      return { ...r, maxX: r.maxX - ARCADE };
  }
}

/** Arcade pillar centres: one at each unit edge, set just inside the front line. */
export function pillarSpots(b: CityBuilding): { x: number; z: number }[] {
  if (!b.arcade) return [];
  const r = b.rect;
  const inset = 0.3;
  if (b.facing === "n" || b.facing === "s") {
    const z = b.facing === "n" ? r.minZ + inset : r.maxZ - inset;
    return [{ x: r.minX + inset, z }, { x: r.maxX - inset, z }];
  }
  const x = b.facing === "w" ? r.minX + inset : r.maxX - inset;
  return [{ x, z: r.minZ + inset }, { x, z: r.maxZ - inset }];
}

export const PILLAR_R = 0.22;

function propRect(p: Prop): Rect {
  const s = PROP_SIZE[p.kind];
  // Rotated by a quarter turn? swap the footprint
  const quarter = Math.abs(Math.sin(p.rotY)) > 0.7;
  const w = quarter ? s.d : s.w;
  const d = quarter ? s.w : s.d;
  return rect(p.x - w / 2, p.x + w / 2, p.z - d / 2, p.z + d / 2);
}

export function makeColliders(buildings: CityBuilding[], props: Prop[], signals: Signal[]): Colliders {
  const boxes: BoxCollider[] = [];
  const circles: CircleCollider[] = [];
  for (const b of buildings) {
    if (b.kind === "mamak") {
      // Walk-in restaurant: only the kitchen block, side walls and the furniture are solid
      const room = roomColliders(b);
      boxes.push({ id: b.id, rect: backBlock(b) }, ...room.boxes);
      circles.push(...room.circles);
      continue;
    }
    boxes.push({ id: b.id, rect: buildingWalls(b) });
    for (const [k, p] of pillarSpots(b).entries()) circles.push({ id: `${b.id}-pillar${k}`, x: p.x, z: p.z, r: PILLAR_R });
  }
  for (const p of props) {
    const s = PROP_SIZE[p.kind];
    if (p.kind === "tree") {
      // Trees in planters are covered by the planter box; street trees get a trunk circle
      circles.push({ id: p.id, x: p.x, z: p.z, r: 0.3 });
    } else if (s.r != null) circles.push({ id: p.id, x: p.x, z: p.z, r: s.r });
    else boxes.push({ id: p.id, rect: propRect(p) });
  }
  for (const s of signals) circles.push({ id: s.id, x: s.x, z: s.z, r: 0.2 });
  return { boxes, circles };
}

export { propRect };
