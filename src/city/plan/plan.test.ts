/**
 * The v2 city must be overlap-free by construction. These checks prove it for the current
 * plan and catch regressions when the plan grows.
 */

import { describe, expect, it } from "vitest";
import {
  asphalt,
  BUILDINGS,
  buildingWalls,
  COLLIDERS,
  GRID,
  inRect,
  LANES,
  overlap,
  propRect,
  type Rect,
  SPAWN,
  STREETS,
} from "./index";

const EPS = 0.01;
const ASPHALT = asphalt(GRID);

const hits = (r: Rect, list: Rect[]) => list.some((o) => overlap(r, o) > EPS);
const onAsphalt = (x: number, z: number) => ASPHALT.some((a) => inRect(x, z, a, EPS));
const onSidewalk = (x: number, z: number) => GRID.sidewalks.some((s) => inRect(x, z, s));

function blockedAt(x: number, z: number, pad: number) {
  return COLLIDERS.boxes.some((b) => inRect(x, z, b.rect, pad)) || COLLIDERS.circles.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + pad);
}

describe("grid", () => {
  it("roads, junctions and sidewalks never overlap", () => {
    const all = [...ASPHALT.map((r) => ({ r, k: "asphalt" })), ...GRID.sidewalks.map((r) => ({ r, k: "sidewalk" }))];
    const bad: string[] = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (overlap(all[i].r, all[j].r) > EPS) bad.push(`${all[i].k} #${i} / ${all[j].k} #${j}`);
    expect(bad).toEqual([]);
  });
});

describe("buildings", () => {
  it("stay inside their block lot (never on sidewalks or roads)", () => {
    const bad = BUILDINGS.filter((b) => hits(b.rect, [...ASPHALT, ...GRID.sidewalks])).map((b) => b.id);
    expect(bad).toEqual([]);
  });

  it("never overlap each other", () => {
    const bad: string[] = [];
    for (let i = 0; i < BUILDINGS.length; i++)
      for (let j = i + 1; j < BUILDINGS.length; j++) if (overlap(BUILDINGS[i].rect, BUILDINGS[j].rect) > EPS) bad.push(`${BUILDINGS[i].id} / ${BUILDINGS[j].id}`);
    expect(bad).toEqual([]);
  });

  it("have no religious buildings", () => {
    expect(BUILDINGS.filter((b) => /SURAU|MASJID|MOSQUE|KUIL|GEREJA|TEMPLE|CHURCH/i.test(b.sign)).map((b) => b.id)).toEqual([]);
  });
});

describe("props", () => {
  it("sit off the asphalt", () => {
    const bad = STREETS.props.filter((p) => hits(propRect(p), ASPHALT)).map((p) => p.id);
    expect(bad).toEqual([]);
  });

  it("don't touch building walls or each other", () => {
    const walls = BUILDINGS.map(buildingWalls);
    const bad: string[] = [];
    const props = STREETS.props.filter((p) => p.kind !== "tree" || !STREETS.props.some((q) => q.kind === "planter" && q.x === p.x && q.z === p.z));
    for (const p of props) if (hits(propRect(p), walls)) bad.push(`${p.id} hits a wall`);
    for (let i = 0; i < props.length; i++)
      for (let j = i + 1; j < props.length; j++) if (overlap(propRect(props[i]), propRect(props[j])) > EPS) bad.push(`${props[i].id} / ${props[j].id}`);
    expect(bad).toEqual([]);
  });

  it("kerb lamps and street trees stand on sidewalks, clear of crossings", () => {
    const zebras = STREETS.markings.filter((m) => m.kind === "zebra").map((m) => m.rect);
    const street = STREETS.props.filter((p) => (p.kind === "lamp" || p.kind === "tree") && !GRID.blocks.some((b) => inRect(p.x, p.z, b.lot)));
    const bad = street.filter((p) => !onSidewalk(p.x, p.z) || zebras.some((z) => inRect(p.x, p.z, z, 1.5))).map((p) => p.id);
    expect(bad).toEqual([]);
  });

  it("signal poles stand on sidewalk corners", () => {
    expect(STREETS.signals.filter((s) => !onSidewalk(s.x, s.z) || onAsphalt(s.x, s.z)).map((s) => s.id)).toEqual([]);
  });
});

describe("markings and lanes", () => {
  it("are painted on asphalt only", () => {
    const bad = STREETS.markings.filter((m) => {
      const c = { x: (m.rect.minX + m.rect.maxX) / 2, z: (m.rect.minZ + m.rect.maxZ) / 2 };
      return !onAsphalt(c.x, c.z);
    });
    expect(bad.length).toBe(0);
  });

  it("every lane starts and ends on asphalt and leads somewhere", () => {
    const bad = LANES.filter((l) => !onAsphalt(l.start.x, l.start.z) || !onAsphalt(l.end.x, l.end.z) || l.next.length === 0).map((l) => l.id);
    expect(bad).toEqual([]);
  });
});

describe("walking", () => {
  it("spawn and every door are free of colliders", () => {
    const spots = [{ id: "spawn", ...SPAWN }, ...BUILDINGS.map((b) => ({ id: `door ${b.id}`, ...b.door }))];
    expect(spots.filter((s) => blockedAt(s.x, s.z, 0.3)).map((s) => s.id)).toEqual([]);
  });

  it("every door can be reached on foot from spawn", () => {
    const STEP = 0.5;
    const B = GRID.bounds;
    const nx = Math.ceil((B.maxX - B.minX) / STEP) + 1;
    const nz = Math.ceil((B.maxZ - B.minZ) / STEP) + 1;
    const idx = (x: number, z: number) => Math.round((x - B.minX) / STEP) + Math.round((z - B.minZ) / STEP) * nx;
    const seen = new Uint8Array(nx * nz);
    const start = idx(SPAWN.x, SPAWN.z);
    seen[start] = 1;
    const queue = [start];
    while (queue.length) {
      const i = queue.pop()!;
      const ix = i % nx;
      for (const j of [ix > 0 ? i - 1 : -1, ix < nx - 1 ? i + 1 : -1, i - nx, i + nx]) {
        if (j < 0 || j >= seen.length || seen[j]) continue;
        const x = B.minX + (j % nx) * STEP;
        const z = B.minZ + Math.floor(j / nx) * STEP;
        if (blockedAt(x, z, 0.4)) {
          seen[j] = 2;
          continue;
        }
        seen[j] = 1;
        queue.push(j);
      }
    }
    const unreachable = BUILDINGS.filter((b) => seen[idx(b.door.x, b.door.z)] !== 1).map((b) => b.id);
    expect(unreachable).toEqual([]);
  });
});
