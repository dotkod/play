/**
 * Layout registry: every solid footprint in the city, in one list.
 *
 * Scenes, collisions, the map and the layout check (`pnpm check:layout`) all read from here,
 * so a building moved in one place moves everywhere. When you add a building, landmark or
 * large prop, export its footprint from the district's meta/layout and add it below.
 */

import { BILLBOARD_PANEL_T, BILLBOARD_PANEL_W, BILLBOARD_SPOTS } from "@/content/ads/billboards";
import { BINTIK_BLOCKS } from "./districts/bukit-bintik/meta";
import { STADIUM, STADIUM_SOLID_R } from "./districts/bukit-jalan/meta";
import { KAMPUNG_HOUSES } from "./districts/kampung-lepak/meta";
import { KLCC_PODIUM, TOWER_HALF, TOWER_L, TOWER_R } from "./districts/klcc/meta";
import { MENARA_BASE, TOWER_POS as MENARA_TOWER } from "./districts/menara-lepak/meta";
import { PASAR_HALLS, pasarHallFootprint } from "./districts/pasar-besar/buildings";
import { PETALING_SHOPS, petalingFootprint } from "./districts/petaling-lane/buildings";
import { BUILDINGS, footprint } from "./districts/pusat-lepak/layout";
import { SENTRAL_HALL, SENTRAL_HALL_SIZE } from "./districts/sentral-lepak/meta";
import { PLAYGROUND, TERRACES } from "./districts/taman-ceria/layout";
import { MENARA_106, MENARA_106_BASE } from "./districts/tlx/meta";
import { PARKING_LOTS } from "./parking-lots";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * - `building`: walls the player bumps into
 * - `ground`: flat paved areas (parking, playground) that must not overlap buildings
 * - `prop`: big street furniture (billboards)
 * - `scenery`: soft areas the map keeps trees out of (masjid grounds, river)
 */
export type SolidKind = "building" | "ground" | "prop" | "scenery";

export type Solid = {
  id: string;
  kind: SolidKind;
  box: Box;
  /** Round solids (stadium); `box` is the bounding square. */
  r?: number;
  /** Which face is the shopfront, flush with the sidewalk (Pusat rows). */
  front?: "minZ" | "maxZ";
  /** True if the player collides with it today. */
  blocksPlayer: boolean;
};

export function centredBox(x: number, z: number, w: number, d: number): Box {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function circle(id: string, x: number, z: number, r: number, kind: SolidKind, blocksPlayer: boolean): Solid {
  return { id, kind, box: centredBox(x, z, r * 2, r * 2), r, blocksPlayer };
}

/** Billboard panel as an axis-aligned box around its rotated footprint. */
function billboardBox(x: number, z: number, rotY: number): Box {
  const hw = BILLBOARD_PANEL_W / 2;
  const ht = BILLBOARD_PANEL_T / 2;
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  const ex = hw * c + ht * s;
  const ez = hw * s + ht * c;
  return { minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez };
}

export const SOLIDS: Solid[] = [
  ...BUILDINGS.map((b): Solid => {
    const f = footprint(b);
    return {
      id: b.id,
      kind: "building",
      box: { minX: f.minX, maxX: f.maxX, minZ: f.minZ, maxZ: f.maxZ },
      front: b.side === "north" ? "maxZ" : "minZ",
      blocksPlayer: true,
    };
  }),
  ...TERRACES.map((t): Solid => ({ id: t.id, kind: "building", box: centredBox(t.x, t.z, t.w, t.d), blocksPlayer: true })),
  ...PETALING_SHOPS.map((s): Solid => ({ id: s.id, kind: "building", box: petalingFootprint(s), blocksPlayer: true })),
  ...PASAR_HALLS.map((h): Solid => ({ id: h.id, kind: "building", box: pasarHallFootprint(h), blocksPlayer: true })),
  { id: "klcc-tower-l", kind: "building", box: centredBox(TOWER_L.x, TOWER_L.z, TOWER_HALF * 2, TOWER_HALF * 2), blocksPlayer: true },
  { id: "klcc-tower-r", kind: "building", box: centredBox(TOWER_R.x, TOWER_R.z, TOWER_HALF * 2, TOWER_HALF * 2), blocksPlayer: true },
  { id: "klcc-podium", kind: "building", box: centredBox(KLCC_PODIUM.x, KLCC_PODIUM.z, KLCC_PODIUM.w, KLCC_PODIUM.d), blocksPlayer: true },
  { id: "menara-lepak", kind: "building", box: centredBox(MENARA_TOWER.x, MENARA_TOWER.z, MENARA_BASE, MENARA_BASE), blocksPlayer: true },
  { id: "menara-106", kind: "building", box: centredBox(MENARA_106.x, MENARA_106.z, MENARA_106_BASE, MENARA_106_BASE), blocksPlayer: true },
  {
    id: "sentral-hall",
    kind: "building",
    box: centredBox(SENTRAL_HALL.x, SENTRAL_HALL.z, SENTRAL_HALL_SIZE.w, SENTRAL_HALL_SIZE.d),
    blocksPlayer: true,
  },
  ...BINTIK_BLOCKS.map((b, i): Solid => ({ id: `bintik-${i}`, kind: "building", box: centredBox(b.x, b.z, b.w, b.d), blocksPlayer: true })),
  ...KAMPUNG_HOUSES.map((h, i): Solid => ({ id: `kampung-${i}`, kind: "building", box: centredBox(h.x, h.z, h.w, h.d), blocksPlayer: true })),
  circle("stadium", STADIUM.x, STADIUM.z, STADIUM_SOLID_R, "building", true),
  ...PARKING_LOTS.map((l): Solid => ({ id: l.id, kind: "ground", box: centredBox(l.x, l.z, l.w, l.d), blocksPlayer: false })),
  { id: "playground", kind: "ground", box: centredBox(PLAYGROUND.x, PLAYGROUND.z, PLAYGROUND.w, PLAYGROUND.d), blocksPlayer: false },
  ...BILLBOARD_SPOTS.map((b): Solid => ({ id: `billboard-${b.id}`, kind: "prop", box: billboardBox(b.x, b.z, b.rotY), blocksPlayer: false })),
  circle("masjid-lepak", -28, 22, 10, "scenery", false),
  { id: "sungai-lepak", kind: "scenery", box: { minX: -38, maxX: -26, minZ: 6, maxZ: 58 }, blocksPlayer: false },
];

export function solidById(id: string) {
  return SOLIDS.find((s) => s.id === id);
}

export function padBox(b: Box, pad: number): Box {
  return { minX: b.minX - pad, maxX: b.maxX + pad, minZ: b.minZ - pad, maxZ: b.maxZ + pad };
}

/** Overlap depth on each axis (positive = overlapping). */
export function boxOverlap(a: Box, b: Box) {
  return {
    x: Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX),
    z: Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ),
  };
}

export function pointInSolid(x: number, z: number, s: Solid, pad = 0) {
  if (s.r != null) {
    const cx = (s.box.minX + s.box.maxX) / 2;
    const cz = (s.box.minZ + s.box.maxZ) / 2;
    return Math.hypot(x - cx, z - cz) < s.r + pad;
  }
  return x > s.box.minX - pad && x < s.box.maxX + pad && z > s.box.minZ - pad && z < s.box.maxZ + pad;
}

/** First solid of the given kinds containing the point, if any. */
export function solidAt(x: number, z: number, pad = 0, kinds: SolidKind[] = ["building"]) {
  return SOLIDS.find((s) => kinds.includes(s.kind) && pointInSolid(x, z, s, pad));
}
