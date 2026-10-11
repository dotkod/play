/**
 * Elevated station shell + street pavilion. Body and roofs are separate so roofs
 * can fade when they block the follow camera (same idea as city building cutaway).
 */

import { box, cyl, type Part } from "@/city/kit/merge";
import {
  LINE_COLOR,
  PLAT_BACK_Z,
  PLAT_EDGE_Z,
  PLATFORM_ALONG,
  PLATFORM_DEPTH,
  PLATFORM_Y,
} from "../plan/constants";

const CONCRETE = "#c5c0b4";
const DECK = "#b8b3a6";
const DECK_DARK = "#9a9588";
const TACTILE = "#e8b923";
const INK = "#2a2520";
const CREAM = "#f3efe4";
const GLASS = "#9ec4d4";
const METAL = "#6b6f78";
const PAVEMENT = "#8a8f7c";
const CURB = "#9a9588";
const BENCH = "#5c4033";

function platformFurniture(stX: number, y: number, platZ1: number): Part[] {
  const half = PLATFORM_ALONG / 2;
  const furnZ = platZ1 - 1.15;
  const parts: Part[] = [];
  for (const cx of [stX - half + 3.3, stX + half - 3.3]) {
    parts.push(box([2.0, 0.12, 0.48], [cx, y + 0.42, furnZ], BENCH));
    parts.push(box([2.0, 0.42, 0.1], [cx, y + 0.68, furnZ - 0.22], BENCH));
    parts.push(box([0.1, 0.42, 0.48], [cx - 0.95, y + 0.45, furnZ], BENCH));
    parts.push(box([0.1, 0.42, 0.48], [cx + 0.95, y + 0.45, furnZ], BENCH));
  }
  for (const cx of [stX - half + 5.25, stX + half - 5.25]) {
    parts.push(cyl(0.2, 0.22, 0.75, [cx, y + 0.38, furnZ], METAL, { segments: 8 }));
  }
  return parts;
}

function platformRails(stX: number, y: number, platZ0: number, platZ1: number): Part[] {
  const half = PLATFORM_ALONG / 2;
  const railH = 1.05;
  const parts: Part[] = [];
  // End rails (west / east)
  for (const side of [-1, 1] as const) {
    const rx = stX + side * (half - 0.12);
    parts.push(box([0.08, railH, PLATFORM_DEPTH - 0.3], [rx, y + railH / 2, (platZ0 + platZ1) / 2], METAL));
    parts.push(box([0.12, 0.06, PLATFORM_DEPTH - 0.2], [rx, y + railH, (platZ0 + platZ1) / 2], METAL));
  }
  // South wing rails (outside concourse opening)
  const wingW = 1.5;
  for (const side of [-1, 1] as const) {
    const cx = stX + side * (half - wingW / 2);
    parts.push(box([wingW - 0.2, railH, 0.08], [cx, y + railH / 2, platZ1 - 0.08], METAL));
    parts.push(box([wingW - 0.1, 0.06, 0.1], [cx, y + railH, platZ1 - 0.08], METAL));
    for (const dx of [-wingW / 2 + 0.25, wingW / 2 - 0.25]) {
      parts.push(cyl(0.04, 0.04, railH, [cx + dx, y + railH / 2, platZ1 - 0.08], METAL, { segments: 6 }));
    }
  }
  return parts;
}

/** Decks, columns, stairs, glass pavilion, lift/escalator — everything except opaque roofs. */
export function stationBodyParts(stX: number): Part[] {
  const half = PLATFORM_ALONG / 2;
  const platZ0 = PLAT_EDGE_Z;
  const platZ1 = PLAT_BACK_Z;
  const concZ1 = platZ1 + 6.5;
  const stairZ0 = concZ1;
  const stairZ1 = platZ1 + 13.5;
  const streetZ0 = stairZ1;
  const streetZ1 = platZ1 + 21.5;
  const y = PLATFORM_Y;
  const parts: Part[] = [];

  // Platform + concourse decks
  parts.push(box([PLATFORM_ALONG, 0.22, PLATFORM_DEPTH], [stX, y - 0.11, (platZ0 + platZ1) / 2], DECK));
  parts.push(box([PLATFORM_ALONG - 3, 0.22, concZ1 - platZ1], [stX, y - 0.11, (platZ1 + concZ1) / 2], DECK));

  // Yellow tactile strip + darker boarding band (above deck — no coplanar fight)
  parts.push(box([PLATFORM_ALONG - 0.2, 0.04, 0.38], [stX, y + 0.02, platZ0 + 0.22], TACTILE, { outline: false }));
  parts.push(box([PLATFORM_ALONG - 0.2, 0.03, 0.28], [stX, y + 0.015, platZ0 + 0.55], DECK_DARK, { outline: false }));

  parts.push(...platformRails(stX, y, platZ0, platZ1));
  parts.push(...platformFurniture(stX, y, platZ1));

  // Elevated columns
  for (const dx of [-half + 2, 0, half - 2]) {
    parts.push(cyl(0.3, 0.34, y + 3.8, [stX + dx, (y + 3.8) / 2, platZ1 + 1.4], CONCRETE, { segments: 10 }));
    parts.push(cyl(0.3, 0.34, y + 3.8, [stX + dx, (y + 3.8) / 2, platZ0 + 1.6], CONCRETE, { segments: 10 }));
  }

  // Concourse glass side panels (lobby feel)
  for (const side of [-1, 1]) {
    const gx = stX + side * (half - 1.2);
    parts.push(box([0.12, 2.6, concZ1 - platZ1 - 0.6], [gx, y + 1.4, (platZ1 + concZ1) / 2 + 0.2], GLASS, { outline: false }));
    parts.push(box([0.2, 2.8, 0.2], [gx, y + 1.5, platZ1 + 0.5], METAL));
    parts.push(box([0.2, 2.8, 0.2], [gx, y + 1.5, concZ1 - 0.4], METAL));
  }

  // Gate header beam (paid-zone cue)
  parts.push(box([8.5, 0.35, 0.35], [stX, y + 2.55, platZ1 + 0.55], LINE_COLOR));
  parts.push(box([8.2, 0.18, 0.08], [stX, y + 2.55, platZ1 + 0.72], CREAM, { outline: false }));

  // Stairs (wider run)
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const z0 = stairZ0 + (stairZ1 - stairZ0) * t0;
    const z1 = stairZ0 + (stairZ1 - stairZ0) * t1;
    const hy = PLATFORM_Y * (1 - (t0 + t1) / 2);
    parts.push(box([5.2, 0.18, z1 - z0], [stX, hy - 0.05, (z0 + z1) / 2], CONCRETE));
  }
  // Stair handrails
  for (const side of [-1, 1]) {
    const rx = stX + side * 2.75;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const z = stairZ0 + (stairZ1 - stairZ0) * t;
      const hy = PLATFORM_Y * (1 - t) + 0.95;
      parts.push(cyl(0.04, 0.04, 1.0, [rx, hy, z], METAL, { segments: 6 }));
    }
    for (let i = 0; i < steps - 1; i++) {
      const t = (i + 0.5) / steps;
      const t2 = (i + 1.5) / steps;
      const z = stairZ0 + (stairZ1 - stairZ0) * ((t + t2) / 2);
      const hy = PLATFORM_Y * (1 - (t + t2) / 2) + 1.45;
      parts.push(box([0.08, 0.06, (stairZ1 - stairZ0) / steps], [rx, hy, z], METAL));
    }
  }

  // Lift shaft (west of stairs)
  const liftX = stX - 4.2;
  const liftZ = (stairZ0 + stairZ1) / 2;
  parts.push(box([2.2, 9.2, 5.8], [liftX, 4.6, liftZ], CONCRETE));
  parts.push(box([1.6, 2.4, 0.08], [liftX, 1.4, liftZ + 2.95], GLASS, { outline: false }));
  parts.push(box([1.6, 2.4, 0.08], [liftX, y + 1.4, liftZ - 2.95], GLASS, { outline: false }));
  parts.push(box([2.4, 0.35, 6.0], [liftX, 9.3, liftZ], LINE_COLOR));

  // Escalator box (east of stairs)
  const escX = stX + 4.2;
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    const z0 = stairZ0 + (stairZ1 - stairZ0) * t0;
    const z1 = stairZ0 + (stairZ1 - stairZ0) * t1;
    const hy = PLATFORM_Y * (1 - (t0 + t1) / 2);
    parts.push(box([2.0, 0.35, z1 - z0 + 0.05], [escX, hy + 0.2, (z0 + z1) / 2], METAL));
    parts.push(box([1.7, 1.1, z1 - z0], [escX, hy + 0.95, (z0 + z1) / 2], GLASS, { outline: false }));
  }
  parts.push(box([2.3, 0.2, stairZ1 - stairZ0 + 0.4], [escX, 0.12, liftZ], CONCRETE));

  // Street plaza pavement + curb
  const streetW = 16;
  const streetD = streetZ1 - streetZ0;
  parts.push(box([streetW, 0.08, streetD], [stX, 0.04, (streetZ0 + streetZ1) / 2], PAVEMENT));
  parts.push(box([streetW + 0.4, 0.14, 0.35], [stX, 0.08, streetZ1 - 0.15], CURB));
  parts.push(box([0.35, 0.14, streetD], [stX - streetW / 2, 0.08, (streetZ0 + streetZ1) / 2], CURB));
  parts.push(box([0.35, 0.14, streetD], [stX + streetW / 2, 0.08, (streetZ0 + streetZ1) / 2], CURB));

  // Glass entrance wings under street canopy
  for (const side of [-1, 1]) {
    const wx = stX + side * 6.8;
    parts.push(box([0.12, 3.2, streetD - 1.2], [wx, 1.7, (streetZ0 + streetZ1) / 2], GLASS, { outline: false }));
    parts.push(box([0.22, 3.4, 0.22], [wx, 1.8, streetZ0 + 0.6], METAL));
    parts.push(box([0.22, 3.4, 0.22], [wx, 1.8, streetZ1 - 0.6], METAL));
  }
  for (const dx of [-5.5, 5.5]) {
    parts.push(box([0.45, 3.6, 0.45], [stX + dx, 1.9, streetZ1 - 0.95], INK));
  }

  // Canopy posts
  for (const [px, pz] of [
    [stX - 7.2, streetZ0 + 1.2],
    [stX + 7.2, streetZ0 + 1.2],
    [stX - 7.2, streetZ1 - 1.2],
    [stX + 7.2, streetZ1 - 1.2],
    [stX - 3.5, streetZ0 + 1.2],
    [stX + 3.5, streetZ0 + 1.2],
  ] as const) {
    parts.push(cyl(0.16, 0.18, 3.8, [px, 1.9, pz], INK, { segments: 8 }));
  }

  // Street furniture
  for (const dx of [-6.2, 6.2]) {
    parts.push(box([1.6, 0.12, 0.45], [stX + dx, 0.45, streetZ0 + 2.2], BENCH));
    parts.push(box([1.6, 0.45, 0.1], [stX + dx, 0.7, streetZ0 + 2.0], BENCH));
    parts.push(cyl(0.22, 0.22, 0.7, [stX + dx * 0.85, 0.35, streetZ0 + 3.6], METAL, { segments: 8 }));
  }

  // Platform end board backplates
  parts.push(box([0.14, 1.35, 3.2], [stX - half + 0.2, y + 2.7, (platZ0 + platZ1) / 2], INK));
  parts.push(box([0.14, 1.35, 3.2], [stX + half - 0.2, y + 2.7, (platZ0 + platZ1) / 2], INK));

  return parts;
}

/** Street canopy + elevated banded shelter — faded when they block the camera. */
export function stationRoofParts(stX: number): Part[] {
  const platZ0 = PLAT_EDGE_Z;
  const platZ1 = PLAT_BACK_Z;
  const concZ1 = platZ1 + 6.5;
  const streetZ0 = platZ1 + 13.5;
  const streetZ1 = platZ1 + 21.5;
  const y = PLATFORM_Y;
  const streetD = streetZ1 - streetZ0;
  const roofZ0 = platZ0 - 0.6;
  const roofZ1 = concZ1 + 0.4;
  const roofD = roofZ1 - roofZ0;
  const roofCz = (roofZ0 + roofZ1) / 2;
  return [
    // Elevated shelter — shallow double band (red outer + cream inner)
    box([PLATFORM_ALONG + 1.6, 0.28, roofD], [stX, y + 4.35, roofCz], LINE_COLOR),
    box([PLATFORM_ALONG + 1.0, 0.18, roofD - 0.5], [stX, y + 4.55, roofCz], CREAM),
    box([PLATFORM_ALONG + 0.6, 0.12, roofD - 0.9], [stX, y + 4.15, roofCz], CONCRETE),
    // Light track-edge overhang lip
    box([PLATFORM_ALONG + 0.8, 0.08, 0.45], [stX, y + 4.05, platZ0 - 0.35], LINE_COLOR),
    // Street pavilion canopy
    box([16.8, 0.28, streetD + 0.6], [stX, 4.05, (streetZ0 + streetZ1) / 2], LINE_COLOR),
    box([16.2, 0.12, streetD + 0.2], [stX, 3.85, (streetZ0 + streetZ1) / 2], CONCRETE),
  ];
}

/** @deprecated use stationBodyParts + stationRoofParts */
export function stationParts(stX: number): Part[] {
  return [...stationBodyParts(stX), ...stationRoofParts(stX)];
}
