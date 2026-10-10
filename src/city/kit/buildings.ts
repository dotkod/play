/**
 * Building kit. Every building in the city is assembled from the same parts and proportions
 * (floor heights, window sizes, pillars, parapets, trims), so the whole city reads as one
 * place. Each function returns plain parts in world space; the renderer merges a row or a
 * tower into one mesh, plus a separate "glow" mesh for windows lit at night.
 */

import { ARCADE, buildingHeight, type CityBuilding, FLOOR_H, GROUND_H, seeded } from "../plan/lots";
import { MAMAK_TABLE_U, pillarSpots } from "../plan/colliders";
import { ball, box, cyl, type Part } from "./merge";

const GLASS = "#5f86a3";
const GLASS_SHOP = "#9cc9da";
const FRAME = "#f7f3ea";
const ROOF = "#8c9096";
const DARK = "#2a2a33";
const LIT = "#ffd98a";

export type BuildingParts = { parts: Part[]; glow: Part[] };

/**
 * Local frame for a building: u runs along the frontage, v runs inward from the front line,
 * y is up. `at` maps (u, y, v) to world coordinates; `sz` maps a (u, y, v) size to world.
 */
function frame(b: CityBuilding) {
  const r = b.rect;
  const along = b.facing === "n" || b.facing === "s";
  const width = along ? r.maxX - r.minX : r.maxZ - r.minZ;
  const depth = along ? r.maxZ - r.minZ : r.maxX - r.minX;
  const at = (u: number, y: number, v: number): [number, number, number] => {
    switch (b.facing) {
      case "n":
        return [r.minX + u, y, r.minZ + v];
      case "s":
        return [r.maxX - u, y, r.maxZ - v];
      case "w":
        return [r.minX + v, y, r.maxZ - u];
      case "e":
        return [r.maxX - v, y, r.minZ + u];
    }
  };
  const sz = (u: number, y: number, v: number): [number, number, number] => (along ? [u, y, v] : [v, y, u]);
  return { width, depth, at, sz };
}

/** Rows of windows on the upper floors, a few of them lit at night. */
function upperWindows(b: CityBuilding, parts: Part[], glow: Part[], perFloor: number, rnd: () => number) {
  const { width, at, sz } = frame(b);
  for (let f = 1; f < b.floors; f++) {
    const y = GROUND_H + (f - 1) * FLOOR_H + FLOOR_H * 0.52;
    for (let k = 0; k < perFloor; k++) {
      const u = (width * (k + 0.5)) / perFloor;
      parts.push(box(sz(1.5, 1.7, 0.16), at(u, y, -0.04), FRAME));
      parts.push(box(sz(1.2, 1.4, 0.1), at(u, y, -0.11), GLASS, { outline: false }));
      if (rnd() < 0.45) glow.push(box(sz(1.18, 1.38, 0.04), at(u, y, -0.17), LIT));
    }
  }
}

export function shophouseParts(b: CityBuilding): BuildingParts {
  const rnd = seeded(hash(b.id));
  const { width: w, depth: d, at, sz } = frame(b);
  const H = buildingHeight(b);
  const parts: Part[] = [];
  const glow: Part[] = [];
  const upperH = H - GROUND_H;

  // Shop behind the five-foot way, upper floors overhanging it on pillars
  parts.push(box(sz(w, GROUND_H, d - ARCADE), at(w / 2, GROUND_H / 2, ARCADE + (d - ARCADE) / 2), shade(b.color, -0.08)));
  if (upperH > 0) parts.push(box(sz(w, upperH, d), at(w / 2, GROUND_H + upperH / 2, d / 2), b.color));
  for (const p of pillarSpots(b)) parts.push(box([0.42, GROUND_H, 0.42], [p.x, GROUND_H / 2, p.z], b.trim));

  // Shopfront: glass, door, roller-shutter box
  parts.push(box(sz(w - 1.4, 2.3, 0.08), at(w / 2, 1.35, ARCADE - 0.05), GLASS_SHOP, { outline: false }));
  parts.push(box(sz(1.2, 2.3, 0.1), at(w / 2, 1.35, ARCADE - 0.09), shade(b.color, -0.35)));
  parts.push(box(sz(w - 0.6, 0.45, 0.3), at(w / 2, 2.9, ARCADE - 0.12), shade(b.trim, -0.1)));
  if (rnd() < 0.6) glow.push(box(sz(w - 1.5, 2.1, 0.03), at(w / 2, 1.35, ARCADE - 0.1), "#ffe7b3"));

  // Fascia shelf under the sign (the sign itself is one textured strip per row)
  parts.push(box(sz(w, 0.14, 0.5), at(w / 2, GROUND_H + 0.05, -0.2), b.trim));
  // Pilasters frame each unit; a parapet tops the facade
  for (const u of [0.12, w - 0.12]) parts.push(box(sz(0.24, upperH, 0.14), at(u, GROUND_H + upperH / 2, -0.06), b.trim));
  parts.push(box(sz(w, 0.7, 0.32), at(w / 2, H + 0.35, 0.16), b.trim));
  parts.push(box(sz(w, 0.18, d), at(w / 2, H + 0.09, d / 2), ROOF, { outline: false }));
  upperWindows(b, parts, glow, w > 6.8 ? 3 : 2, rnd);

  // Rooftop and back-lane clutter: water tank, AC units
  if (rnd() < 0.5) {
    parts.push(cyl(0.55, 0.55, 1.1, at(w * 0.7, H + 0.75, d * 0.6), "#d8dde2"));
  }
  parts.push(box(sz(0.9, 0.6, 0.5), at(w * 0.3, GROUND_H + 1.2, d + 0.25), "#e4e6e8"));
  parts.push(box(sz(1.1, 2.2, 0.08), at(w * 0.7, 1.1, d + 0.04), DARK));
  return { parts, glow };
}

export function mamakParts(b: CityBuilding): BuildingParts {
  const { width: w, depth: d, at, sz } = frame(b);
  const H = buildingHeight(b);
  const parts: Part[] = [];
  const glow: Part[] = [];
  const upperH = H - GROUND_H;

  // Open-fronted ground floor: dark interior, counter, menu board; upper floor overhangs
  parts.push(box(sz(w, GROUND_H, d - ARCADE), at(w / 2, GROUND_H / 2, ARCADE + (d - ARCADE) / 2), "#ece5d6"));
  parts.push(box(sz(w - 1.2, GROUND_H - 0.6, 0.06), at(w / 2, (GROUND_H - 0.6) / 2, ARCADE - 0.03), "#3b2f2a", { outline: false }));
  parts.push(box(sz(3.2, 1.1, 0.7), at(w * 0.72, 0.55, ARCADE + 0.35), "#c62f25"));
  parts.push(box(sz(2.2, 1.3, 0.08), at(w * 0.25, 2.3, ARCADE - 0.06), "#1f1a17"));
  glow.push(box(sz(w - 1.4, GROUND_H - 0.8, 0.03), at(w / 2, (GROUND_H - 0.6) / 2, ARCADE - 0.07), "#ffe7b3"));
  parts.push(box(sz(w, upperH, d), at(w / 2, GROUND_H + upperH / 2, d / 2), b.color));
  for (const p of pillarSpots(b)) parts.push(box([0.42, GROUND_H, 0.42], [p.x, GROUND_H / 2, p.z], b.trim));

  // Striped awning over the five-foot way
  const stripes = Math.round(w / 0.9);
  for (let k = 0; k < stripes; k++) {
    const u = (w * (k + 0.5)) / stripes;
    parts.push(box(sz(w / stripes, 0.08, 1.4), at(u, GROUND_H - 0.25, -0.55), k % 2 ? "#f7f5ef" : b.trim, { rotX: 0, outline: k === 0 }));
  }
  parts.push(box(sz(w, 0.14, 0.5), at(w / 2, GROUND_H + 0.05, -0.2), b.trim));
  parts.push(box(sz(w, 0.7, 0.32), at(w / 2, H + 0.35, 0.16), b.trim));
  parts.push(box(sz(w, 0.18, d), at(w / 2, H + 0.09, d / 2), ROOF, { outline: false }));
  upperWindows(b, parts, glow, 4, seeded(hash(b.id)));

  // Two round tables with stools at the ends of the five-foot way (colliders: mamakTables)
  for (const u of [MAMAK_TABLE_U, w - MAMAK_TABLE_U]) {
    parts.push(cyl(0.55, 0.55, 0.06, at(u, 0.78, 1.25), "#f4efe4"));
    parts.push(cyl(0.06, 0.06, 0.75, at(u, 0.38, 1.25), DARK, { outline: false }));
    for (const [du, dv] of [
      [-0.85, 0],
      [0.85, 0],
    ])
      parts.push(cyl(0.2, 0.2, 0.45, at(u + du, 0.23, 1.25 + dv), "#2f6fd6"));
  }
  return { parts, glow };
}

/** Glass-banded office tower on a two-storey podium. */
export function officeParts(b: CityBuilding): BuildingParts {
  const rnd = seeded(hash(b.id));
  const { width: w, depth: d, at, sz } = frame(b);
  const H = buildingHeight(b);
  const parts: Part[] = [];
  const glow: Part[] = [];

  parts.push(box(sz(w, H, d), at(w / 2, H / 2, d / 2), b.color));
  // Glass band per floor on all four faces (one band per floor reads as curtain wall)
  for (let f = 0; f < b.floors; f++) {
    const y = (f === 0 ? GROUND_H : GROUND_H + f * FLOOR_H) - FLOOR_H * 0.45;
    const h = f === 0 ? 2.6 : FLOOR_H * 0.62;
    const yy = f === 0 ? 1.5 : y;
    parts.push(box(sz(w - 0.8, h, 0.08), at(w / 2, yy, -0.04), GLASS, { outline: false }));
    parts.push(box(sz(w - 0.8, h, 0.08), at(w / 2, yy, d + 0.04), GLASS, { outline: false }));
    parts.push(box(sz(0.08, h, d - 0.8), at(-0.04, yy, d / 2), GLASS, { outline: false }));
    parts.push(box(sz(0.08, h, d - 0.8), at(w + 0.04, yy, d / 2), GLASS, { outline: false }));
    if (f > 0 && rnd() < 0.5) {
      const u0 = rnd() * (w - 6) + 3;
      glow.push(box(sz(4 + rnd() * 3, h - 0.2, 0.03), at(u0, yy, -0.1), LIT));
    }
  }
  // Entrance canopy, crown and antenna
  parts.push(box(sz(6, 0.3, 2.4), at(w / 2, 3.2, -1.2), b.trim));
  parts.push(cyl(0.12, 0.12, 3.1, at(w / 2 - 2.8, 1.55, -2.2), b.trim));
  parts.push(cyl(0.12, 0.12, 3.1, at(w / 2 + 2.8, 1.55, -2.2), b.trim));
  parts.push(box(sz(w * 0.6, 1.6, d * 0.6), at(w / 2, H + 0.8, d / 2), shade(b.color, -0.12)));
  parts.push(cyl(0.08, 0.12, 5, at(w / 2, H + 4, d / 2), "#d0d5dc"));
  parts.push(ball(0.22, at(w / 2, H + 6.6, d / 2), "#d8352a"));
  return { parts, glow };
}

/** Low, wide mall with a glass atrium entrance and colour stripes. */
export function mallParts(b: CityBuilding): BuildingParts {
  const { width: w, depth: d, at, sz } = frame(b);
  const H = buildingHeight(b);
  const parts: Part[] = [];
  const glow: Part[] = [];
  parts.push(box(sz(w, H, d), at(w / 2, H / 2, d / 2), b.color));
  for (const [k, c] of ["#f28c28", "#2f8f86", "#c62f25"].entries()) {
    parts.push(box(sz(w + 0.1, 0.5, d + 0.1), at(w / 2, GROUND_H + 1 + k * 0.6, d / 2), c, { outline: false }));
  }
  parts.push(box(sz(10, GROUND_H + FLOOR_H, 1.2), at(w / 2, (GROUND_H + FLOOR_H) / 2, -0.4), GLASS));
  glow.push(box(sz(9.6, GROUND_H + FLOOR_H - 0.4, 0.03), at(w / 2, (GROUND_H + FLOOR_H) / 2, -1.03), "#ffe7b3"));
  parts.push(box(sz(w - 4, 1.2, 0.3), at(w / 2, H - 0.8, -0.16), "#ffffff"));
  for (const u of [w * 0.2, w * 0.45, w * 0.75]) parts.push(box(sz(2.4, 1.2, 1.8), at(u, H + 0.6, d * 0.5), "#e4e6e8"));
  return { parts, glow };
}

export function buildingParts(b: CityBuilding): BuildingParts {
  switch (b.kind) {
    case "mamak":
      return mamakParts(b);
    case "office":
      return officeParts(b);
    case "mall":
      return mallParts(b);
    default:
      return shophouseParts(b);
  }
}

/** Front sign strip placement for a row: centre, size and rotation in world space. */
export function signStrip(b: CityBuilding) {
  const { width: w, at } = frame(b);
  const pos = at(w / 2, GROUND_H + 0.72, -0.48);
  const rotY = b.facing === "n" ? Math.PI : b.facing === "s" ? 0 : b.facing === "w" ? -Math.PI / 2 : Math.PI / 2;
  return { pos, rotY, width: w, height: 1.0 };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const bl = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}
