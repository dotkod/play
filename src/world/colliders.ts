import { BUILDINGS, doorSpot, EXTENT, footprint, WALK_HALF } from "./districts/pusat-lepak/layout";
import { staticHash } from "./spatial-hash";

export type Circle = { x: number; z: number; r: number };

export function mamakTables() {
  return BUILDINGS.filter((b) => b.kind === "mamak").flatMap((b) => {
    const f = footprint(b);
    const z = f.front + f.facing * 1.1;
    return [b.x - 3.2, b.x + 3.2].map((x) => ({ x, z }));
  });
}

const DOORS = BUILDINGS.filter((b) => b.game || b.soon || b.lrt).map(doorSpot);
const clearOfDoors = (x: number, z: number) => DOORS.every((d) => Math.abs(d.x - x) > 3.5 || Math.sign(d.z) !== Math.sign(z));

export function streetSpots() {
  const out: { x: number; z: number; kind: "lamp" | "tree" }[] = [];
  for (let p = -EXTENT + 4; p <= EXTENT - 4; p += 9) {
    if (Math.abs(p) < WALK_HALF + 3) continue;
    const kind = Math.round(p / 9) % 2 === 0 ? "lamp" : "tree";
    for (const s of [-1, 1]) {
      if (clearOfDoors(p, s)) out.push({ x: p, z: s * (WALK_HALF - 0.6), kind });
      out.push({ x: s * (WALK_HALF - 0.6), z: p, kind });
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

export const staticColliders: Circle[] = [
  ...[-1.6, -0.5, 0.6, 1.6].map((dx) => ({ x: BUS_STOP.x + dx, z: BUS_STOP.z - 0.3, r: 0.7 })),
  { x: STALL.x, z: STALL.z, r: 1.2 },
  { x: STALL.x + 1.5, z: STALL.z + 0.3, r: 0.45 },
  ...mamakTables().map((t) => ({ ...t, r: 0.7 })),
  ...streetSpots().map((s) => ({ x: s.x, z: s.z, r: s.kind === "tree" ? 0.35 : 0.2 })),
  ...TRAFFIC_POLES.map((p) => ({ ...p, r: 0.25 })),
];

staticHash.clear();
staticHash.insertAll(staticColliders);

export const dynamicColliders = {
  vehicles: [] as Circle[],
  people: [] as Circle[],
  cats: [] as Circle[],
};
