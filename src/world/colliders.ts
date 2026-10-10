import { BILLBOARD_PANEL_W, BILLBOARD_SPOTS } from "@/content/ads/billboards";
import { BUILDINGS, doorSpot, EXTENT, mamakTableSpots, ROAD_HALF, WALK_HALF } from "./districts/pusat-lepak/layout";
import { PARKING_LOTS } from "./parking-lots";
import { solidAt } from "./placements";
import { staticHash } from "./spatial-hash";
import { ROAD_STRIPS } from "./walk-spine";

export type Circle = { x: number; z: number; r: number };

export function mamakTables() {
  return BUILDINGS.filter((b) => b.kind === "mamak").flatMap(mamakTableSpots);
}

const DOORS = BUILDINGS.filter((b) => b.game || b.soon || b.lrt).map(doorSpot);
const clearOfDoors = (x: number, z: number) => DOORS.every((d) => Math.abs(d.x - x) > 3.5 || Math.sign(d.z) !== Math.sign(z));

/** True if a Pusat sidewalk prop would sit on a district spur / arterial carriageway. */
function onCarriageway(x: number, z: number) {
  const pad = ROAD_HALF + 1.0;
  for (const s of ROAD_STRIPS) {
    if (s.axis === "x") {
      if (Math.abs(z - s.z) <= pad && x >= s.x0 - 1 && x <= s.x1 + 1) return true;
    } else if (Math.abs(x - s.x) <= pad && z >= s.z0 - 1 && z <= s.z1 + 1) return true;
  }
  return false;
}

/**
 * Cross-road sidewalk sits at |x|≈5.4 — Warung / Anne corner / Farmasi footprints reach there.
 * Pad covers tree canopy (Ball r≈1.1 + side blob) so foliage isn’t inside walls.
 */
const insideBuilding = (x: number, z: number) => !!solidAt(x, z, 2.2);

function spotOk(x: number, z: number) {
  return !onCarriageway(x, z) && !insideBuilding(x, z);
}

export function streetSpots() {
  const out: { x: number; z: number; kind: "lamp" | "tree" }[] = [];
  for (let p = -EXTENT + 4; p <= EXTENT - 4; p += 9) {
    if (Math.abs(p) < WALK_HALF + 3) continue;
    const kind = Math.round(p / 9) % 2 === 0 ? "lamp" : "tree";
    for (const s of [-1, 1]) {
      const along = { x: p, z: s * (WALK_HALF - 0.6) };
      const cross = { x: s * (WALK_HALF - 0.6), z: p };
      if (clearOfDoors(along.x, along.z) && spotOk(along.x, along.z)) out.push({ ...along, kind });
      if (spotOk(cross.x, cross.z)) out.push({ ...cross, kind });
    }
  }
  return out;
}

export const TRAFFIC_POLES = [
  { x: -WALK_HALF - 0.2, z: -WALK_HALF + 0.6 },
  { x: WALK_HALF + 0.2, z: WALK_HALF - 0.6 },
  { x: WALK_HALF - 0.6, z: -WALK_HALF - 0.2 },
  { x: -WALK_HALF + 0.6, z: WALK_HALF + 0.2 },
];

export const BUS_STOP = { x: 24, z: 5.6 };
export const STALL = { x: -8.5, z: -5.2 };

const parkedCarColliders: Circle[] = PARKING_LOTS.flatMap((lot) =>
  lot.stalls.map((s) => ({ x: lot.x + s.dx, z: lot.z + s.dz, r: 1.35 })),
);

export const staticColliders: Circle[] = [
  ...[-1.6, -0.5, 0.6, 1.6].map((dx) => ({ x: BUS_STOP.x + dx, z: BUS_STOP.z - 0.3, r: 0.7 })),
  { x: STALL.x, z: STALL.z, r: 1.2 },
  { x: STALL.x + 1.5, z: STALL.z + 0.3, r: 0.45 },
  ...mamakTables().map((t) => ({ ...t, r: 0.7 })),
  ...streetSpots().map((s) => ({ x: s.x, z: s.z, r: s.kind === "tree" ? 0.35 : 0.2 })),
  ...TRAFFIC_POLES.map((p) => ({ ...p, r: 0.25 })),
  ...BILLBOARD_SPOTS.flatMap((b) => {
    const c = Math.cos(b.rotY);
    const s = Math.sin(b.rotY);
    const half = BILLBOARD_PANEL_W / 2 - 0.2;
    return [
      { x: b.x + c * half, z: b.z - s * half, r: 0.35 },
      { x: b.x - c * half, z: b.z + s * half, r: 0.35 },
    ];
  }),
  ...parkedCarColliders,
];

staticHash.clear();
staticHash.insertAll(staticColliders);

export const dynamicColliders = {
  vehicles: [] as Circle[],
  people: [] as Circle[],
  cats: [] as Circle[],
};
