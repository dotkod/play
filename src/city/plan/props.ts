/**
 * Street furniture, road markings and paved surfaces, placed from the grid and lots.
 *
 * Kerb-side props (lamps, trees) sit in a fixed band along each road and stop short of
 * junctions and crossings; block props (benches, planters, bins) stay inside their lot.
 */

import { ARCADE, type CityBuilding, type BlockKind } from "./lots";
import { type Grid, type GridNode, rect, type Rect, ROAD_HALF, WALK_W } from "./grid";

export type PropKind = "lamp" | "tree" | "bench" | "bin" | "planter" | "busStop" | "fountain" | "playground";
export type Prop = { id: string; kind: PropKind; x: number; z: number; rotY: number; variant: number };

export type Marking = { kind: "zebra" | "stop" | "dash" | "edge"; rect: Rect; /** zebra stripes run along this axis */ axis?: "x" | "z" };
export type Surface = { kind: "plaza" | "lane" | "path" | "grass"; rect: Rect };

/** Travel direction unit vectors. */
export type Dir = { x: number; z: number };
export const leftOf = (d: Dir): Dir => ({ x: d.z, z: -d.x });

export type Signal = {
  id: string;
  node: GridNode;
  /** Direction of the traffic this head controls. */
  dir: Dir;
  x: number;
  z: number;
  rotY: number;
};

/** Half-size of each prop's footprint (for colliders and overlap checks). */
export const PROP_SIZE: Record<PropKind, { w: number; d: number; r?: number }> = {
  lamp: { w: 0.4, d: 0.4, r: 0.2 },
  tree: { w: 0.9, d: 0.9, r: 0.45 },
  bench: { w: 1.8, d: 0.6 },
  bin: { w: 0.7, d: 0.7, r: 0.35 },
  planter: { w: 2.4, d: 1.2 },
  busStop: { w: 4.2, d: 1.2 },
  fountain: { w: 4.8, d: 4.8, r: 2.4 },
  playground: { w: 6, d: 4 },
};

const KERB_BAND = 0.9; // prop centre distance from the kerb into the sidewalk
const CORNER_CLEAR = 6.5; // keep junction corners and crossings clear

export type StreetPlan = {
  props: Prop[];
  markings: Marking[];
  surfaces: Surface[];
  signals: Signal[];
  busStop: { x: number; z: number; rotY: number };
};

export function planStreets(grid: Grid, buildings: CityBuilding[], blockKinds: Map<string, BlockKind>): StreetPlan {
  const props: Prop[] = [];
  const markings: Marking[] = [];
  const surfaces: Surface[] = [];
  const signals: Signal[] = [];
  let n = 0;
  const add = (kind: PropKind, x: number, z: number, rotY = 0, variant = 0) => props.push({ id: `${kind}-${n++}`, kind, x, z, rotY, variant });

  // Bus stop on the south side of the road between the park and the block below it
  const busSeg = grid.segments.find((s) => s.axis === "x" && s.a.i === 1 && s.a.j === 2) ?? grid.segments[0];
  const busStop = { x: (busSeg.a.x + busSeg.b.x) / 2, z: busSeg.a.z + ROAD_HALF + 0.65, rotY: Math.PI };
  add("busStop", busStop.x, busStop.z, busStop.rotY);

  for (const s of grid.segments) {
    const len = s.axis === "x" ? s.rect.maxX - s.rect.minX : s.rect.maxZ - s.rect.minZ;
    const start = s.axis === "x" ? s.rect.minX : s.rect.minZ;
    const across = s.axis === "x" ? s.a.z : s.a.x;
    const at = (along: number, off: number) => (s.axis === "x" ? { x: along, z: across + off } : { x: across + off, z: along });

    // Lane markings: centre dashes and solid edge lines, clear of the crossings
    for (let t = start + CORNER_CLEAR; t + 3 <= start + len - CORNER_CLEAR; t += 6) {
      markings.push({ kind: "dash", rect: s.axis === "x" ? rect(t, t + 3, across - 0.07, across + 0.07) : rect(across - 0.07, across + 0.07, t, t + 3) });
    }
    for (const side of [-1, 1]) {
      const o = side * (ROAD_HALF - 0.35);
      markings.push({
        kind: "edge",
        rect: s.axis === "x" ? rect(start, start + len, across + o - 0.06, across + o + 0.06) : rect(across + o - 0.06, across + o + 0.06, start, start + len),
      });
    }

    // Kerb props on both sides: lamps at the ends, trees between
    for (const side of [-1, 1]) {
      const off = side * (ROAD_HALF + KERB_BAND);
      const usable = len - 2 * CORNER_CLEAR;
      const count = Math.max(2, Math.round(usable / 10) + 1);
      for (let k = 0; k < count; k++) {
        const along = start + CORNER_CLEAR + (usable * k) / (count - 1);
        const p = at(along, off);
        if (Math.hypot(p.x - busStop.x, p.z - busStop.z) < 4.5) continue;
        // Lamp arms reach over the road
        const face = s.axis === "x" ? (side < 0 ? 0 : Math.PI) : side < 0 ? Math.PI / 2 : -Math.PI / 2;
        if (k === 0 || k === count - 1) add("lamp", p.x, p.z, face);
        else add("tree", p.x, p.z, 0, k % 3);
      }
    }
  }

  // Signals, crossings and stop lines at every 4-way junction
  for (const node of grid.nodes.filter((nd) => nd.signal)) {
    const dirs: Dir[] = [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 },
    ];
    for (const d of dirs) {
      // Traffic heading `d` arrives from the -d arm; its lane is on its left
      const l = leftOf(d);
      const arm = { x: -d.x, z: -d.z };
      const near = ROAD_HALF + 0.6;
      const far = ROAD_HALF + 3.6;
      const zebra =
        arm.x !== 0
          ? rect(node.x + arm.x * (arm.x > 0 ? near : far), node.x + arm.x * (arm.x > 0 ? far : near), node.z - ROAD_HALF, node.z + ROAD_HALF)
          : rect(node.x - ROAD_HALF, node.x + ROAD_HALF, node.z + arm.z * (arm.z > 0 ? near : far), node.z + arm.z * (arm.z > 0 ? far : near));
      markings.push({ kind: "zebra", rect: zebra, axis: arm.x !== 0 ? "z" : "x" });

      const stopAt = ROAD_HALF + 4.1;
      const lane0 = 0.15;
      const lane1 = ROAD_HALF - 0.4;
      if (arm.x !== 0) {
        const x = node.x + arm.x * stopAt;
        const z0 = node.z + l.z * lane0;
        const z1 = node.z + l.z * lane1;
        markings.push({ kind: "stop", rect: rect(x - 0.2, x + 0.2, Math.min(z0, z1), Math.max(z0, z1)) });
      } else {
        const z = node.z + arm.z * stopAt;
        const x0 = node.x + l.x * lane0;
        const x1 = node.x + l.x * lane1;
        markings.push({ kind: "stop", rect: rect(Math.min(x0, x1), Math.max(x0, x1), z - 0.2, z + 0.2) });
      }

      // Pole on the near-left corner of the approach, head facing oncoming traffic
      const c = ROAD_HALF + 0.9;
      signals.push({
        id: `sig-${node.id}-${d.x}${d.z}`,
        node,
        dir: d,
        x: node.x + arm.x * c + l.x * c,
        z: node.z + arm.z * c + l.z * c,
        rotY: Math.atan2(arm.x, arm.z),
      });
    }
  }

  // Block interiors
  for (const b of grid.blocks) {
    const kind = blockKinds.get(b.id);
    const r = b.lot;
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    if (kind === "park") {
      surfaces.push({ kind: "grass", rect: r });
      surfaces.push({ kind: "path", rect: rect(cx - 1.4, cx + 1.4, r.minZ, r.maxZ) });
      surfaces.push({ kind: "path", rect: rect(r.minX, r.maxX, cz - 1.4, cz + 1.4) });
      surfaces.push({ kind: "plaza", rect: rect(cx - 4.5, cx + 4.5, cz - 4.5, cz + 4.5) });
      add("fountain", cx, cz);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const qx = cx + sx * 9.5;
          const qz = cz + sz * 9.5;
          if (sx > 0 && sz > 0) {
            add("playground", qx, qz);
            continue;
          }
          for (const [dx, dz] of [
            [-3.5, -3.5],
            [3.5, 0],
            [-1, 4],
          ])
            add("tree", qx + dx, qz + dz, 0, Math.abs(dx + dz) % 3);
        }
      }
      for (const [x, z, rot] of [
        [cx - 3.2, cz - 6.5, 0],
        [cx + 3.2, cz + 6.5, Math.PI],
        [cx - 6.5, cz + 3.2, Math.PI / 2],
        [cx + 6.5, cz - 3.2, -Math.PI / 2],
      ])
        add("bench", x, z, rot);
    } else if (kind === "office" || kind === "mall") {
      surfaces.push({ kind: "plaza", rect: r });
      const tower = buildings.find((bd) => bd.group.startsWith(b.id));
      // Planters with trees around the plaza edge, clear of the tower and its door side
      const spots: [number, number][] = [];
      for (let t = r.minX + 3; t <= r.maxX - 3; t += 7) spots.push([t, r.minZ + 1.6], [t, r.maxZ - 1.6]);
      for (const [x, z] of spots) {
        if (tower && x > tower.rect.minX - 2.5 && x < tower.rect.maxX + 2.5 && z > tower.rect.minZ - 3.5 && z < tower.rect.maxZ + 3.5) continue;
        add("planter", x, z);
        add("tree", x, z, 0, 2);
      }
    } else if (kind === "shophouse") {
      // Service lane between the two rows, with bins against the back walls
      const lane = rect(r.minX, r.maxX, r.minZ + 13, r.maxZ - 13);
      surfaces.push({ kind: "lane", rect: lane });
      for (let t = r.minX + 4; t < r.maxX - 3; t += 9) {
        add("bin", t, lane.minZ + 0.6);
        add("bin", t + 4.5, lane.maxZ - 0.6);
      }
    }
  }

  // A bench under every second shophouse arcade is too cluttered; one per row end instead
  for (const bd of buildings.filter((x) => x.kind === "shophouse" && x.id.endsWith("-0"))) {
    const front = bd.facing === "n" ? bd.rect.minZ : bd.rect.maxZ;
    const inward = bd.facing === "n" ? 1 : -1;
    add("bench", bd.rect.minX + 1.6, front + inward * (ARCADE - 0.7), bd.facing === "n" ? Math.PI : 0);
  }

  return { props, markings, surfaces, signals, busStop };
}

/** Sidewalk band where kerb props live (for tests). */
export const KERB_PROP_OFFSET = ROAD_HALF + KERB_BAND;
export { WALK_W };
