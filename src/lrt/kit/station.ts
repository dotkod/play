/**
 * Elevated station shell + street pavilion. Geometry is driven by plan rects
 * so the sidewalk plaza never drifts onto asphalt.
 */

import { box, cyl, type Part } from "@/city/kit/merge";
import { LINE_COLOR, PLATFORM_ALONG, PLATFORM_DEPTH, PLATFORM_Y } from "../plan/constants";
import type { LrtStation } from "../plan/stations";

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

function mid(a: number, b: number) {
  return (a + b) / 2;
}

function platformFurniture(st: LrtStation, y: number): Part[] {
  const furnZ = st.platform.minZ + 2.35;
  const parts: Part[] = [];
  for (const cx of [st.x - 5.6, st.x + 5.6]) {
    parts.push(box([2.0, 0.12, 0.48], [cx, y + 0.42, furnZ], BENCH));
    parts.push(box([2.0, 0.42, 0.1], [cx, y + 0.68, furnZ - 0.22], BENCH));
    parts.push(box([0.1, 0.42, 0.48], [cx - 0.95, y + 0.45, furnZ], BENCH));
    parts.push(box([0.1, 0.42, 0.48], [cx + 0.95, y + 0.45, furnZ], BENCH));
  }
  for (const cx of [st.x - 7.15, st.x + 7.15]) {
    parts.push(cyl(0.2, 0.22, 0.75, [cx, y + 0.38, furnZ], METAL, { segments: 8 }));
  }
  return parts;
}

function platformRails(st: LrtStation, y: number): Part[] {
  const half = PLATFORM_ALONG / 2;
  const platZ0 = st.platform.minZ;
  const platZ1 = st.platform.maxZ;
  const railH = 1.05;
  const parts: Part[] = [];
  for (const side of [-1, 1] as const) {
    const rx = st.x + side * (half - 0.12);
    parts.push(box([0.08, railH, PLATFORM_DEPTH - 0.3], [rx, y + railH / 2, mid(platZ0, platZ1)], METAL));
    parts.push(box([0.12, 0.06, PLATFORM_DEPTH - 0.2], [rx, y + railH, mid(platZ0, platZ1)], METAL));
  }
  const wingW = 1.5;
  for (const side of [-1, 1] as const) {
    const cx = st.x + side * (half - wingW / 2);
    parts.push(box([wingW - 0.2, railH, 0.08], [cx, y + railH / 2, platZ1 - 0.08], METAL));
    parts.push(box([wingW - 0.1, 0.06, 0.1], [cx, y + railH, platZ1 - 0.08], METAL));
    for (const dx of [-wingW / 2 + 0.25, wingW / 2 - 0.25]) {
      parts.push(cyl(0.04, 0.04, railH, [cx + dx, y + railH / 2, platZ1 - 0.08], METAL, { segments: 6 }));
    }
  }
  return parts;
}

/** Decks, columns, glass pavilion, lift shaft — everything except opaque roofs + moving cabin. */
export function stationBodyParts(st: LrtStation): Part[] {
  const half = PLATFORM_ALONG / 2;
  const platZ0 = st.platform.minZ;
  const platZ1 = st.platform.maxZ;
  const concZ0 = st.concourse.minZ;
  const concZ1 = st.concourse.maxZ;
  const streetZ0 = st.street.minZ;
  const streetZ1 = st.street.maxZ;
  const streetW = st.street.maxX - st.street.minX;
  const streetD = streetZ1 - streetZ0;
  const y = PLATFORM_Y;
  const parts: Part[] = [];

  parts.push(box([PLATFORM_ALONG, 0.22, PLATFORM_DEPTH], [st.x, y - 0.11, mid(platZ0, platZ1)], DECK));
  parts.push(
    box([st.concourse.maxX - st.concourse.minX, 0.22, concZ1 - concZ0], [st.x, y - 0.11, mid(concZ0, concZ1)], DECK),
  );

  parts.push(box([PLATFORM_ALONG - 0.2, 0.04, 0.38], [st.x, y + 0.02, platZ0 + 0.22], TACTILE, { outline: false }));
  parts.push(box([PLATFORM_ALONG - 0.2, 0.03, 0.28], [st.x, y + 0.015, platZ0 + 0.55], DECK_DARK, { outline: false }));

  parts.push(...platformRails(st, y));
  parts.push(...platformFurniture(st, y));

  // End columns only — no centre pillar in the walk aisle / fare hall
  for (const dx of [-half + 1.15, half - 1.15]) {
    parts.push(cyl(0.3, 0.34, y + 3.8, [st.x + dx, (y + 3.8) / 2, platZ0 + 1.6], CONCRETE, { segments: 10 }));
    parts.push(cyl(0.3, 0.34, y + 3.8, [st.x + dx, (y + 3.8) / 2, platZ1 - 1.1], CONCRETE, { segments: 10 }));
  }

  for (const side of [-1, 1]) {
    const gx = st.x + side * ((st.concourse.maxX - st.concourse.minX) / 2 - 0.15);
    parts.push(box([0.12, 2.6, concZ1 - concZ0 - 0.5], [gx, y + 1.4, mid(concZ0, concZ1) + 0.1], GLASS, { outline: false }));
    parts.push(box([0.2, 2.8, 0.2], [gx, y + 1.5, concZ0 + 0.4], METAL));
    parts.push(box([0.2, 2.8, 0.2], [gx, y + 1.5, concZ1 - 0.35], METAL));
  }

  // Fare-line walls — opaque panels (not clear glass) so the mid span never looks like a walk aisle
  const fareH = 1.2;
  for (const r of st.fareBarriers) {
    const fw = r.maxX - r.minX;
    const fd = r.maxZ - r.minZ;
    if (fw < 0.2) continue;
    parts.push(box([fw, fareH, Math.max(fd, 0.14)], [mid(r.minX, r.maxX), y + fareH / 2, mid(r.minZ, r.maxZ)], METAL));
    parts.push(box([fw, 0.1, Math.max(fd, 0.18)], [mid(r.minX, r.maxX), y + fareH + 0.04, mid(r.minZ, r.maxZ)], LINE_COLOR));
  }

  // Lift shaft stays in the plaza — never inside the fare hall / platform box
  const lx = mid(st.lift.minX, st.lift.maxX);
  const lz = mid(st.lift.minZ, st.lift.maxZ);
  const lw = st.lift.maxX - st.lift.minX;
  const ld = st.lift.maxZ - st.lift.minZ;
  const doorW = 1.44;
  const stubW = Math.max(0.35, (lw - doorW) / 2);
  const streetPortalH = 3.1;
  const deckPortalH = 2.45;
  const shaftTop = y + deckPortalH + 0.2;
  const shaftH = shaftTop;
  parts.push(box([0.28, shaftH, ld + 0.2], [st.lift.minX - 0.14, shaftH / 2, lz], CONCRETE));
  parts.push(box([0.28, shaftH, ld + 0.2], [st.lift.maxX + 0.14, shaftH / 2, lz], CONCRETE));
  const sWallZ = st.lift.maxZ + 0.12;
  parts.push(box([stubW, streetPortalH, 0.22], [st.lift.minX + stubW / 2, streetPortalH / 2, sWallZ], CONCRETE));
  parts.push(box([stubW, streetPortalH, 0.22], [st.lift.maxX - stubW / 2, streetPortalH / 2, sWallZ], CONCRETE));
  parts.push(box([doorW + 0.25, 0.3, 0.26], [lx, streetPortalH - 0.1, sWallZ], CONCRETE));
  const sSolidH = Math.max(0.4, shaftTop - streetPortalH);
  parts.push(box([lw + 0.3, sSolidH, 0.22], [lx, streetPortalH + sSolidH / 2, sWallZ], CONCRETE));
  const nWallZ = st.lift.minZ - 0.12;
  // Solid only below deck — deck portal opens onto the apron, not into the fare hall
  parts.push(box([lw + 0.3, y - 0.05, 0.22], [lx, (y - 0.05) / 2, nWallZ], CONCRETE));
  parts.push(box([stubW, deckPortalH, 0.22], [st.lift.minX + stubW / 2, y + deckPortalH / 2, nWallZ], CONCRETE));
  parts.push(box([stubW, deckPortalH, 0.22], [st.lift.maxX - stubW / 2, y + deckPortalH / 2, nWallZ], CONCRETE));
  parts.push(box([doorW + 0.25, 0.3, 0.26], [lx, y + deckPortalH - 0.1, nWallZ], CONCRETE));
  parts.push(box([lw + 0.4, 0.22, ld + 0.35], [lx, shaftTop + 0.08, lz], LINE_COLOR));
  // Apron bridge: platform lip → lift (keeps the station aisle clear of the shaft)
  const aw = st.apron.maxX - st.apron.minX;
  const ad = st.apron.maxZ - st.apron.minZ;
  if (ad > 0.15) {
    parts.push(box([aw, 0.18, ad], [mid(st.apron.minX, st.apron.maxX), y - 0.09, mid(st.apron.minZ, st.apron.maxZ)], DECK));
  }

  // Compact street plaza (clear of kerb trees) — pavement + canopy posts outside the fascia
  parts.push(box([streetW, 0.08, streetD], [st.x, 0.04, mid(streetZ0, streetZ1)], PAVEMENT));
  parts.push(box([streetW + 0.2, 0.12, 0.25], [st.x, 0.07, streetZ1 - 0.1], CURB));

  // Four posts at canopy corners — inset so they clear the 7.2 m fascia board
  for (const [px, pz] of [
    [st.x - 4.0, streetZ0 + 0.4],
    [st.x + 4.0, streetZ0 + 0.4],
    [st.x - 4.0, streetZ1 - 0.35],
    [st.x + 4.0, streetZ1 - 0.35],
  ] as const) {
    parts.push(cyl(0.12, 0.14, 3.7, [px, 1.9, pz], INK, { segments: 8 }));
  }

  parts.push(box([0.14, 1.35, 3.0], [st.x - half + 0.2, y + 2.7, mid(platZ0, platZ1)], INK));
  parts.push(box([0.14, 1.35, 3.0], [st.x + half - 0.2, y + 2.7, mid(platZ0, platZ1)], INK));

  return parts;
}

/** Street canopy + elevated banded shelter — faded when they block the camera. */
export function stationRoofParts(st: LrtStation): Part[] {
  const platZ0 = st.platform.minZ;
  const concZ1 = st.concourse.maxZ;
  const streetZ0 = st.street.minZ;
  const streetZ1 = st.street.maxZ;
  const streetW = st.street.maxX - st.street.minX;
  const streetD = streetZ1 - streetZ0;
  const y = PLATFORM_Y;
  const roofZ0 = platZ0 - 0.5;
  const roofZ1 = concZ1 + 0.35;
  const roofD = roofZ1 - roofZ0;
  const roofCz = mid(roofZ0, roofZ1);
  return [
    box([PLATFORM_ALONG + 1.4, 0.28, roofD], [st.x, y + 4.35, roofCz], LINE_COLOR),
    box([PLATFORM_ALONG + 0.9, 0.18, roofD - 0.45], [st.x, y + 4.55, roofCz], CREAM),
    box([PLATFORM_ALONG + 0.5, 0.12, roofD - 0.8], [st.x, y + 4.15, roofCz], CONCRETE),
    box([PLATFORM_ALONG + 0.7, 0.08, 0.4], [st.x, y + 4.05, platZ0 - 0.3], LINE_COLOR),
    box([Math.min(streetW, 9.2), 0.22, streetD + 0.25], [st.x, 3.95, mid(streetZ0, streetZ1)], LINE_COLOR),
    box([Math.min(streetW, 8.6), 0.1, streetD], [st.x, 3.78, mid(streetZ0, streetZ1)], CONCRETE),
  ];
}

/** @deprecated use stationBodyParts + stationRoofParts */
export function stationParts(st: LrtStation): Part[] {
  return [...stationBodyParts(st), ...stationRoofParts(st)];
}
