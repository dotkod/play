/**
 * LRT car at the origin, facing +z.
 * Exterior shell for outside view; cabin liner (walls/windows) lives in interior
 * so it stays visible while riding (exterior is hidden in cabin view).
 */

import { box, cyl, type Part } from "@/city/kit/merge";
import { BENCH_SEAT_X, DOOR_HALF, LINE_COLOR, TRAIN_HEIGHT, TRAIN_LEN, TRAIN_WIDTH } from "../plan/constants";

const BODY = "#e8e4da";
const LINER = "#ddd8cc";
const DARK = "#2a2520";
const GLASS = "#5d7f99";
const GLASS_IN = "#6a8aa0";
const FLOOR = "#6b6560";
const SEAT = "#c62f25";
const SEAT_DARK = "#8f1f18";
const POLE = "#c0c4cc";
const CEILING = "#e7e2d6";

/** Exterior shell + bogies (hidden while riding). */
export function trainBodyParts(): Part[] {
  const w = TRAIN_WIDTH;
  const len = TRAIN_LEN;
  const h = TRAIN_HEIGHT;
  const t = 0.1;
  const doorZ0 = -DOOR_HALF;
  const doorZ1 = DOOR_HALF;
  const parts: Part[] = [];

  // Full-height side walls with door cutouts (outer skin)
  for (const side of [-1, 1] as const) {
    const x = side * (w / 2 - t / 2);
    // Skirt full length
    parts.push(box([t, 0.55, len - 0.08], [x, 0.45, 0], BODY));
    // Solid panels either side of door bay
    const panelH = h - 1.05;
    const panelY = 0.7 + panelH / 2;
    const zNeg = (-len / 2 + doorZ0) / 2;
    const zPos = (doorZ1 + len / 2) / 2;
    const lenNeg = doorZ0 - -len / 2;
    const lenPos = len / 2 - doorZ1;
    parts.push(box([t, panelH, lenNeg - 0.05], [x, panelY, zNeg], BODY));
    parts.push(box([t, panelH, lenPos - 0.05], [x, panelY, zPos], BODY));
    // Window glass in each side panel
    parts.push(box([0.04, 0.9, lenNeg * 0.55], [x + side * 0.02, 1.85, zNeg], GLASS, { outline: false }));
    parts.push(box([0.04, 0.9, lenPos * 0.55], [x + side * 0.02, 1.85, zPos], GLASS, { outline: false }));
    // Red stripe
    parts.push(box([0.04, 0.18, len - 0.1], [x + side * 0.06, 1.12, 0], LINE_COLOR, { outline: false }));
  }

  // Cab ends
  parts.push(box([w - 0.12, h - 0.9, t], [0, 1.65, len / 2 - t / 2], BODY));
  parts.push(box([w - 0.12, h - 0.9, t], [0, 1.65, -len / 2 + t / 2], BODY));
  parts.push(box([w - 0.35, 0.95, 0.05], [0, 1.9, len / 2 - 0.03], GLASS, { outline: false }));
  parts.push(box([w - 0.35, 0.95, 0.05], [0, 1.9, -len / 2 + 0.03], GLASS, { outline: false }));

  for (const z of [-len * 0.28, len * 0.28] as const) {
    parts.push(cyl(0.28, 0.28, 0.22, [w / 2 - 0.15, 0.28, z], DARK, { rotZ: Math.PI / 2, segments: 10 }));
    parts.push(cyl(0.28, 0.28, 0.22, [-w / 2 + 0.15, 0.28, z], DARK, { rotZ: Math.PI / 2, segments: 10 }));
  }
  return parts;
}

/**
 * Inner cabin walls — visible while riding.
 * Window bands are OPEN (no opaque panes) so the sandbox world shows through.
 * Door bay is open; leafs are a separate mesh.
 */
function cabinLinerParts(): Part[] {
  const w = TRAIN_WIDTH;
  const len = TRAIN_LEN;
  const t = 0.08;
  const wallX = w / 2 - 0.12;
  const doorZ0 = -DOOR_HALF + 0.08;
  const doorZ1 = DOOR_HALF - 0.08;
  const winY = 1.72;
  const winH = 0.95;
  const lowerH = 0.82;
  const lowerY = 0.28 + lowerH / 2;
  const upperH = 0.52;
  const upperY = 2.3;
  const parts: Part[] = [];

  const segments: [number, number][] = [
    [-len / 2 + 0.3, doorZ0],
    [doorZ1, len / 2 - 0.3],
  ];

  for (const side of [-1, 1] as const) {
    const x = side * wallX;
    // Upper band continuous (above windows + over door header)
    parts.push(box([t, upperH, len - 0.45], [x, upperY, 0], LINER));

    for (const [z0, z1] of segments) {
      const zl = z1 - z0;
      const zc = (z0 + z1) / 2;
      // Lower wall only outside the door bay (avoids fighting closed leafs)
      parts.push(box([t, lowerH, zl - 0.04], [x, lowerY, zc], LINER));
      // Window frame rails (open — see outside)
      parts.push(box([t + 0.02, 0.08, zl - 0.1], [x, winY - winH / 2, zc], LINER));
      parts.push(box([t + 0.02, 0.08, zl - 0.1], [x, winY + winH / 2, zc], LINER));
      parts.push(box([t + 0.02, winH + 0.08, 0.09], [x, winY, z0 + 0.05], LINER));
      parts.push(box([t + 0.02, winH + 0.08, 0.09], [x, winY, z1 - 0.05], LINER));
      const n = Math.max(1, Math.floor(zl / 2.4));
      for (let i = 1; i <= n; i++) {
        const mz = z0 + (zl * i) / (n + 1);
        parts.push(box([t + 0.02, winH, 0.07], [x, winY, mz], LINER));
      }
    }

    // Door frames — clear of leaf faces (leafs sit inset toward aisle)
    parts.push(box([t, 2.1, 0.1], [x, 1.22, doorZ0], LINER));
    parts.push(box([t, 2.1, 0.1], [x, 1.22, doorZ1], LINER));
    parts.push(box([t, 0.1, doorZ1 - doorZ0], [x, 2.32, 0], LINER));
    // Low sill in door bay only (not full-height wall)
    parts.push(box([t, 0.14, doorZ1 - doorZ0], [x, 0.34, 0], LINER));
  }

  // Cab end liners — open windshield band so ends show the world too
  const endT = 0.08;
  for (const end of [-1, 1] as const) {
    const z = end * (len / 2 - 0.2);
    parts.push(box([w - 0.4, lowerH, endT], [0, lowerY, z], LINER));
    parts.push(box([w - 0.4, upperH, endT], [0, upperY, z], LINER));
    parts.push(box([0.12, winH, endT], [-w / 2 + 0.35, winY, z], LINER));
    parts.push(box([0.12, winH, endT], [w / 2 - 0.35, winY, z], LINER));
  }

  return parts;
}

/** Thin tint panes (separate transparent mesh) — does not block the outside view. */
export function trainCabinGlassParts(): Part[] {
  const w = TRAIN_WIDTH;
  const len = TRAIN_LEN;
  const wallX = w / 2 - 0.12;
  const doorZ0 = -DOOR_HALF + 0.08;
  const doorZ1 = DOOR_HALF - 0.08;
  const winY = 1.72;
  const winH = 0.9;
  const parts: Part[] = [];
  const segments: [number, number][] = [
    [-len / 2 + 0.4, doorZ0],
    [doorZ1, len / 2 - 0.4],
  ];
  for (const side of [-1, 1] as const) {
    const x = side * (wallX - 0.02);
    for (const [z0, z1] of segments) {
      parts.push(box([0.02, winH, z1 - z0 - 0.25], [x, winY, (z0 + z1) / 2], GLASS_IN, { outline: false }));
    }
  }
  for (const end of [-1, 1] as const) {
    const z = end * (len / 2 - 0.18);
    parts.push(box([w - 0.7, winH, 0.02], [0, winY, z], GLASS_IN, { outline: false }));
  }
  return parts;
}

export function trainRoofParts(): Part[] {
  const w = TRAIN_WIDTH;
  const len = TRAIN_LEN;
  const h = TRAIN_HEIGHT;
  return [
    box([w - 0.1, 0.16, len - 0.1], [0, h - 0.04, 0], LINE_COLOR),
    box([w - 0.25, 0.06, len - 0.3], [0, h - 0.22, 0], "#d4cfc4"),
  ];
}

/**
 * Cabin interior — layers (local y):
 *   floor ~0.27 · cushion top ~0.59 · seat-backs above cushion ·
 *   poles up to rail underside · rails ~2.42 · ceiling ~2.58
 */
export function trainInteriorParts(): Part[] {
  const w = TRAIN_WIDTH;
  const len = TRAIN_LEN;
  const parts: Part[] = [...cabinLinerParts()];

  parts.push(box([w - 0.45, 0.1, len - 0.5], [0, 0.22, 0], FLOOR));
  // Ceiling well above overhead rails
  parts.push(box([w - 0.45, 0.05, len - 0.55], [0, 2.58, 0], CEILING));

  const cushionY = 0.52;
  const cushionH = 0.14;
  const cushionTop = cushionY + cushionH / 2;
  const benchD = 0.38;
  const seatX = BENCH_SEAT_X;
  // Seat backs sit fully above the cushion (no shared face)
  const backH = 0.38;
  const backY = cushionTop + 0.04 + backH / 2;

  for (const [z0, zl] of [
    [-5.8, 4.0],
    [1.8, 4.0],
  ] as const) {
    const zc = z0 + zl / 2;
    parts.push(box([benchD, cushionH, zl], [seatX, cushionY, zc], SEAT));
    parts.push(box([0.06, backH, zl - 0.08], [seatX + benchD / 2 - 0.02, backY, zc], SEAT_DARK));
  }
  for (const [z0, zl] of [
    [-6.0, 3.0],
    [3.0, 3.0],
  ] as const) {
    const zc = z0 + zl / 2;
    parts.push(box([benchD, cushionH, zl], [-seatX, cushionY, zc], SEAT));
    parts.push(box([0.06, backH, zl - 0.08], [-seatX - benchD / 2 + 0.02, backY, zc], SEAT_DARK));
  }

  // Grab poles on the aisle face of the seats (not through seat backs)
  const poleX = seatX - benchD / 2 - 0.1; // ~1.09
  const poleZs = [-4.6, -2.6, 2.6, 4.6] as const;
  // Overhead rails sit on pole tops (no coplanar share with seats / TVs)
  const railY = 2.42;
  const railH = 0.04;
  const poleTop = railY - railH / 2;
  const poleBot = 0.28;
  const poleH = poleTop - poleBot;
  const poleMidY = poleBot + poleH / 2;
  for (const z of poleZs) {
    parts.push(cyl(0.032, 0.032, poleH, [poleX, poleMidY, z], POLE, { segments: 8 }));
    parts.push(cyl(0.032, 0.032, poleH, [-poleX, poleMidY, z], POLE, { segments: 8 }));
  }

  // Longitudinal rails — stop short of cab ends; end TVs sit between the two rail lines
  const railLen = 10.4;
  const railX = poleX;
  parts.push(box([0.05, railH, railLen], [railX, railY, 0], POLE));
  parts.push(box([0.05, railH, railLen], [-railX, railY, 0], POLE));
  // Cap each pole under the long rail (no shared face with the rail)
  for (const z of poleZs) {
    parts.push(box([0.055, 0.03, 0.055], [railX, poleTop - 0.02, z], POLE));
    parts.push(box([0.055, 0.03, 0.055], [-railX, poleTop - 0.02, z], POLE));
  }

  return parts;
}

/** Sliding door leafs — inset toward aisle so they never share a face with the liner. */
export function trainDoorParts(): Part[] {
  const wallX = TRAIN_WIDTH / 2 - 0.2;
  const leafW = DOOR_HALF - 0.1;
  const h = 1.95;
  const y = 0.28 + h / 2;
  // No outline — outlines were fighting the door frames at stations
  return [
    box([0.05, h, leafW], [-wallX, y, -leafW / 2], BODY, { outline: false }),
    box([0.05, h, leafW], [-wallX, y, leafW / 2], BODY, { outline: false }),
    box([0.05, h, leafW], [wallX, y, -leafW / 2], BODY, { outline: false }),
    box([0.05, h, leafW], [wallX, y, leafW / 2], BODY, { outline: false }),
  ];
}
