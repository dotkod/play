/**
 * Layout check (`pnpm check:layout`). Fails when buildings, roads, props or key spots collide,
 * so placement mistakes are caught before they ship instead of in playtesting.
 *
 * Every failure message names the things involved and where, e.g.
 *   "sentral-hall sits on road z=-48 (x -40…0) by 3.0m".
 */

import { describe, expect, it } from "vitest";
import { NAMED_NPCS } from "@/content/npcs";
import { PLACES } from "@/content/places";
import { ALL_RAIL_STATIONS } from "@/content/transit";
import { MAP_BLOCKS, MAP_TREES } from "@/hub/map-decor";
import { BUS_STOP, streetSpots } from "./colliders";
import { BINTIK_BUS_STOP } from "./districts/bukit-bintik/meta";
import { JALAN_BUS_STOP } from "./districts/bukit-jalan/meta";
import { KAMPUNG_BUS_STOP } from "./districts/kampung-lepak/meta";
import { KLCC_BUS_STOP } from "./districts/klcc/meta";
import { MENARA_BUS_STOP } from "./districts/menara-lepak/meta";
import { PASAR_BUS_STOP } from "./districts/pasar-besar/meta";
import { PETALING_BUS_STOP } from "./districts/petaling-lane/meta";
import {
  BUILDING_GAP,
  BUILDINGS,
  buildingBlocksCrossRoad,
  DEFAULT_SPAWN,
  doorSpot,
  ROAD_HALF,
  WORLD_MAX_X,
  WORLD_MAX_Z,
  WORLD_MIN_X,
  WORLD_MIN_Z,
} from "./districts/pusat-lepak/layout";
import { SENTRAL_BUS_STOP } from "./districts/sentral-lepak/meta";
import { TAMAN_BUS_STOP, TAMAN_HOME_DOOR } from "./districts/taman-ceria/meta";
import { TLX_BUS_STOP } from "./districts/tlx/meta";
import { PARKING_LOTS } from "./parking-lots";
import { type Box, boxOverlap, centredBox, padBox, pointInSolid, SOLIDS, type Solid } from "./placements";
import { ROAD_STRIP_JOIN, ROAD_STRIPS, type RoadStrip, SPINE_EDGES, SPINE_NODES } from "./walk-spine";
import { isWalkable } from "./walkability";

const EPS = 0.05;

/**
 * Problems that already exist, with why each is allowed for now. New problems still fail the
 * check. Fixing one also fails it (the entry is stale), so delete its line when you fix it.
 */
const KNOWN: Record<string, string> = {};

const seen = new Set<string>();

/** Fails on any problem that isn't in KNOWN. */
function expectOnlyKnown(errors: string[]) {
  for (const e of errors) seen.add(e);
  expect(errors.filter((e) => !(e in KNOWN))).toEqual([]);
}
/** Billboards keep this far from buildings and lots (matches the old dev assert). */
const BILLBOARD_CLEAR = 4.5;

function asphalt(s: RoadStrip): Box {
  return s.axis === "x"
    ? { minX: s.x0 - ROAD_STRIP_JOIN, maxX: s.x1 + ROAD_STRIP_JOIN, minZ: s.z - ROAD_HALF, maxZ: s.z + ROAD_HALF }
    : { minX: s.x - ROAD_HALF, maxX: s.x + ROAD_HALF, minZ: s.z0 - ROAD_STRIP_JOIN, maxZ: s.z1 + ROAD_STRIP_JOIN };
}

function roadName(s: RoadStrip) {
  return s.axis === "x" ? `road z=${s.z} (x ${s.x0}…${s.x1})` : `road x=${s.x} (z ${s.z0}…${s.z1})`;
}

const fmt = (n: number) => n.toFixed(1);

function overlaps(a: Box, b: Box) {
  const o = boxOverlap(a, b);
  return o.x > EPS && o.z > EPS ? Math.min(o.x, o.z) : 0;
}

/** Circles (stadium) vs boxes: nearest point on the box inside the radius. */
function solidHitsBox(s: Solid, b: Box) {
  if (s.r == null) return overlaps(s.box, b);
  const cx = (s.box.minX + s.box.maxX) / 2;
  const cz = (s.box.minZ + s.box.maxZ) / 2;
  const px = Math.max(b.minX, Math.min(cx, b.maxX));
  const pz = Math.max(b.minZ, Math.min(cz, b.maxZ));
  const depth = s.r - Math.hypot(px - cx, pz - cz);
  return depth > EPS ? depth : 0;
}

const byKind = (...kinds: Solid["kind"][]) => SOLIDS.filter((s) => kinds.includes(s.kind));

type Spot = { id: string; x: number; z: number };

/** Places a player must be able to stand: spawn, doors, stops, station exits, NPCs. */
const SPOTS: Spot[] = [
  { id: "default spawn", ...DEFAULT_SPAWN },
  ...BUILDINGS.filter((b) => b.game || b.soon || b.lrt || b.interior).map((b) => ({ id: `door ${b.id}`, ...doorSpot(b) })),
  { id: "door home", ...TAMAN_HOME_DOOR },
  ...Object.entries({
    BUS_STOP,
    BINTIK_BUS_STOP,
    JALAN_BUS_STOP,
    KAMPUNG_BUS_STOP,
    KLCC_BUS_STOP,
    MENARA_BUS_STOP,
    PASAR_BUS_STOP,
    PETALING_BUS_STOP,
    SENTRAL_BUS_STOP,
    TAMAN_BUS_STOP,
    TLX_BUS_STOP,
  }).map(([id, p]) => ({ id, x: p.x, z: p.z })),
  ...ALL_RAIL_STATIONS.map((s) => ({ id: `${s.place} exit`, x: s.exitX, z: s.exitZ })),
  ...NAMED_NPCS.map((n) => ({ id: `npc ${n.id}`, x: n.x, z: n.z })),
  ...PLACES.map((p) => ({ id: `place ${p.id}`, x: p.x, z: p.z })),
];

describe("buildings", () => {
  it("do not overlap each other", () => {
    const list = byKind("building");
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = a.r != null ? solidHitsBox(a, b.box) : solidHitsBox(b, a.box);
        if (d) errors.push(`${a.id} overlaps ${b.id} by ${fmt(d)}m`);
      }
    }
    expectOnlyKnown(errors);
  });

  it("do not sit on roads", () => {
    const errors: string[] = [];
    for (const s of byKind("building", "prop", "scenery")) {
      for (const r of ROAD_STRIPS) {
        const d = solidHitsBox(s, asphalt(r));
        if (d) errors.push(`${s.id} sits on ${roadName(r)} by ${fmt(d)}m`);
      }
    }
    expectOnlyKnown(errors);
  });

  it("Pusat rows keep the cross road clear and leave a gap between neighbours", () => {
    const errors: string[] = [];
    for (const b of BUILDINGS) if (buildingBlocksCrossRoad(b)) errors.push(`${b.id} invades the cross-road corridor`);
    for (const a of BUILDINGS) {
      for (const b of BUILDINGS) {
        if (a.id >= b.id || a.side !== b.side) continue;
        const gap = Math.max(a.x - a.w / 2, b.x - b.w / 2) - Math.min(a.x + a.w / 2, b.x + b.w / 2);
        if (gap > -EPS && gap < BUILDING_GAP) errors.push(`${a.id} / ${b.id} gap ${fmt(gap)}m < ${BUILDING_GAP}m`);
      }
    }
    expectOnlyKnown(errors);
  });
});

describe("ground and props", () => {
  it("parking lots and playgrounds stay clear of buildings", () => {
    const errors: string[] = [];
    for (const g of byKind("ground")) {
      for (const b of byKind("building")) {
        const d = solidHitsBox(b, g.box);
        if (d) errors.push(`${g.id} overlaps ${b.id} by ${fmt(d)}m`);
      }
    }
    expectOnlyKnown(errors);
  });

  it("parked cars stay inside their lot", () => {
    const errors: string[] = [];
    for (const lot of PARKING_LOTS) {
      for (const s of lot.stalls) {
        if (Math.abs(s.dx) > lot.w / 2 || Math.abs(s.dz) > lot.d / 2) errors.push(`${lot.id} stall at (${s.dx}, ${s.dz}) is outside the lot`);
      }
    }
    expectOnlyKnown(errors);
  });

  it(`billboards keep ${BILLBOARD_CLEAR}m from buildings and lots`, () => {
    const errors: string[] = [];
    for (const b of byKind("prop")) {
      for (const s of byKind("building", "ground")) {
        if (solidHitsBox(s, padBox(b.box, BILLBOARD_CLEAR))) errors.push(`${b.id} is too close to ${s.id}`);
      }
    }
    expectOnlyKnown(errors);
  });

  it("street trees, lamps and map trees avoid buildings and asphalt", () => {
    const errors: string[] = [];
    const items = [
      ...streetSpots().map((s) => ({ id: `street ${s.kind}`, x: s.x, z: s.z })),
      ...MAP_TREES.map((t) => ({ id: "map tree", x: t.x, z: t.z })),
    ];
    for (const t of items) {
      const hit = byKind("building").find((s) => pointInSolid(t.x, t.z, s));
      if (hit) errors.push(`${t.id} at (${fmt(t.x)}, ${fmt(t.z)}) is inside ${hit.id}`);
      const road = ROAD_STRIPS.find((r) => overlaps(asphalt(r), centredBox(t.x, t.z, 0.4, 0.4)));
      if (road) errors.push(`${t.id} at (${fmt(t.x)}, ${fmt(t.z)}) is on ${roadName(road)}`);
    }
    expectOnlyKnown(errors);
  });

  it("map-only blocks avoid real buildings and asphalt", () => {
    const errors: string[] = [];
    MAP_BLOCKS.forEach((m, i) => {
      const box = centredBox(m.x, m.z, m.w, m.d);
      for (const s of byKind("building", "ground")) if (solidHitsBox(s, box)) errors.push(`map block #${i} overlaps ${s.id}`);
      for (const r of ROAD_STRIPS) if (overlaps(asphalt(r), box)) errors.push(`map block #${i} sits on ${roadName(r)}`);
    });
    expectOnlyKnown(errors);
  });
});

describe("spots", () => {
  it("spawn, doors, stops, station exits, NPCs and places are walkable", () => {
    const errors = SPOTS.filter((p) => !isWalkable(p.x, p.z)).map((p) => `${p.id} at (${fmt(p.x)}, ${fmt(p.z)}) is on grass`);
    expectOnlyKnown(errors);
  });

  it("are all reachable on foot from the default spawn", () => {
    // Flood fill over a 0.5m grid of walkable ground the player's body fits on
    const STEP = 0.5;
    const nx = Math.ceil((WORLD_MAX_X - WORLD_MIN_X) / STEP) + 1;
    const nz = Math.ceil((WORLD_MAX_Z - WORLD_MIN_Z) / STEP) + 1;
    const cell = (x: number, z: number) => Math.round((x - WORLD_MIN_X) / STEP) + Math.round((z - WORLD_MIN_Z) / STEP) * nx;
    const blocking = SOLIDS.filter((s) => s.blocksPlayer);
    const open = (i: number) => {
      const x = WORLD_MIN_X + (i % nx) * STEP;
      const z = WORLD_MIN_Z + Math.floor(i / nx) * STEP;
      return isWalkable(x, z) && !blocking.some((b) => pointInSolid(x, z, b, 0.45));
    };
    const reached = new Uint8Array(nx * nz);
    const start = cell(DEFAULT_SPAWN.x, DEFAULT_SPAWN.z);
    reached[start] = 1;
    const queue = [start];
    while (queue.length) {
      const i = queue.pop()!;
      const ix = i % nx;
      for (const j of [ix > 0 ? i - 1 : -1, ix < nx - 1 ? i + 1 : -1, i - nx, i + nx]) {
        if (j < 0 || j >= reached.length || reached[j]) continue;
        reached[j] = 1;
        if (open(j)) queue.push(j);
        else reached[j] = 2;
      }
    }
    // A spot counts as reachable if any open cell within 1m was reached
    const near = (p: Spot) => {
      for (let dx = -1; dx <= 1; dx += STEP) {
        for (let dz = -1; dz <= 1; dz += STEP) if (reached[cell(p.x + dx, p.z + dz)] === 1) return true;
      }
      return false;
    };
    expectOnlyKnown(SPOTS.filter((p) => !near(p)).map((p) => `${p.id} at (${fmt(p.x)}, ${fmt(p.z)}) can't be reached on foot`));
  });

  it("none of them are inside a building", () => {
    const errors: string[] = [];
    for (const p of SPOTS) {
      const hit = SOLIDS.find((s) => s.blocksPlayer && pointInSolid(p.x, p.z, s));
      if (hit) errors.push(`${p.id} at (${fmt(p.x)}, ${fmt(p.z)}) is inside ${hit.id}`);
    }
    expectOnlyKnown(errors);
  });
});

describe("roads", () => {
  it("every spine node connects to Pusat", () => {
    const reached = new Set(["pusat"]);
    const queue = ["pusat"];
    while (queue.length) {
      const id = queue.shift()!;
      for (const e of SPINE_EDGES) {
        const next = e.a === id ? e.b : e.b === id ? e.a : null;
        if (next && !reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    expectOnlyKnown(Object.keys(SPINE_NODES).filter((id) => !reached.has(id)).map((id) => `node ${id} is not connected`));
  });

  it("every spine edge is axis-aligned and names real nodes", () => {
    const errors: string[] = [];
    for (const e of SPINE_EDGES) {
      const a = SPINE_NODES[e.a];
      const b = SPINE_NODES[e.b];
      if (!a || !b) errors.push(`edge ${e.a}–${e.b} names a missing node`);
      else if (Math.abs(a.x - b.x) > EPS && Math.abs(a.z - b.z) > EPS) errors.push(`edge ${e.a}–${e.b} is diagonal`);
    }
    expectOnlyKnown(errors);
  });

  it("everything sits inside the world bounds", () => {
    const inside = (x: number, z: number) => x >= WORLD_MIN_X && x <= WORLD_MAX_X && z >= WORLD_MIN_Z && z <= WORLD_MAX_Z;
    const errors = [
      ...Object.values(SPINE_NODES).filter((n) => !inside(n.x, n.z)).map((n) => `node ${n.id}`),
      ...SOLIDS.filter((s) => !inside(s.box.minX, s.box.minZ) || !inside(s.box.maxX, s.box.maxZ)).map((s) => s.id),
    ];
    expectOnlyKnown(errors);
  });
});

describe("known issues", () => {
  it("are all still real (delete the KNOWN line once fixed)", () => {
    expect(Object.keys(KNOWN).filter((k) => !seen.has(k))).toEqual([]);
  });
});
