// Round obstacles the player can't walk through. Static ones are built once from the layout;
// dynamic ones (vehicles, pedestrians) are rewritten every frame by whoever moves them.
import { BUILDINGS, doorSpot, EXTENT, footprint, WALK_HALF } from "./world-data";

export type Circle = { x: number; z: number; r: number };

// Outdoor tables in front of the mamak (shared with the city renderer so they always match)
export function mamakTables() {
  return BUILDINGS.filter((b) => b.kind === "mamak").flatMap((b) => {
    const f = footprint(b);
    const z = f.front + f.facing * 1.1;
    return [b.x - 3.2, b.x + 3.2].map((x) => ({ x, z }));
  });
}

// Lamps and trees line the sidewalks, skipping doorways
const DOORS = BUILDINGS.filter((b) => b.game || b.soon).map(doorSpot);
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

export const staticColliders: Circle[] = [
  // A table plus its stools and seated diners
  ...mamakTables().map((t) => ({ ...t, r: 1.25 })),
  ...streetSpots().map((s) => ({ x: s.x, z: s.z, r: s.kind === "tree" ? 0.4 : 0.22 })),
  ...TRAFFIC_POLES.map((p) => ({ ...p, r: 0.25 })),
];

export const dynamicColliders = {
  vehicles: [] as Circle[],
  people: [] as Circle[],
};
