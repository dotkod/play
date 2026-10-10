/**
 * Vehicle models: cars, a delivery van and delivery/ride motorbikes. Built at the origin,
 * facing +z, wheels on the ground. Brands are parodies with recognisable colours only.
 */

import { ball, box, cyl, type Part } from "./merge";

export type CarKind = "hatch" | "sedan" | "suv" | "mpv" | "taxi";
export type Brand = "grap" | "shopi" | "pandai" | "lalamoov";
export type VehicleKind = CarKind | "van" | "bike";

export const BRANDS: Record<Brand, { name: string; main: string; dark: string; text: string }> = {
  grap: { name: "GRAP", main: "#1f9d55", dark: "#167a41", text: "#ffffff" },
  shopi: { name: "SHOPI", main: "#ee4d2d", dark: "#c43a1f", text: "#ffffff" },
  pandai: { name: "foodpandai", main: "#e2147a", dark: "#b20f60", text: "#ffffff" },
  lalamoov: { name: "LALAMOOV", main: "#f16622", dark: "#c44f14", text: "#ffffff" },
};

export const CAR_PAINTS = ["#d8352a", "#2f6fd6", "#f2f2ee", "#1f1f24", "#9aa3ad", "#f2b33d", "#2f8f86", "#7a4a2e"];

/** Length and width used by traffic spacing and collisions. */
export const VEHICLE_SIZE: Record<VehicleKind, { len: number; width: number }> = {
  hatch: { len: 3.7, width: 1.7 },
  sedan: { len: 4.4, width: 1.8 },
  suv: { len: 4.6, width: 1.9 },
  mpv: { len: 4.8, width: 1.9 },
  taxi: { len: 4.4, width: 1.8 },
  van: { len: 4.9, width: 1.9 },
  bike: { len: 1.9, width: 0.7 },
};

const TYRE = "#1f1f24";
const GLASS = "#5d7f99";
const LIGHT = "#fff2c4";
const TAIL = "#c62f25";

function wheels(len: number, width: number, r: number): Part[] {
  const out: Part[] = [];
  for (const z of [len * 0.32, -len * 0.32]) {
    for (const x of [width / 2 - 0.12, -width / 2 + 0.12]) out.push(cyl(r, r, 0.24, [x, r, z], TYRE, { rotZ: Math.PI / 2, segments: 12 }));
  }
  return out;
}

export function carParts(kind: CarKind, paint: string): Part[] {
  const { len, width } = VEHICLE_SIZE[kind];
  const body = kind === "taxi" ? "#d8352a" : paint;
  const tall = kind === "suv" || kind === "mpv";
  const bodyH = tall ? 0.85 : 0.65;
  const cabinH = tall ? 0.8 : 0.62;
  const cabinLen = kind === "hatch" ? len * 0.62 : kind === "mpv" ? len * 0.72 : len * 0.5;
  const cabinZ = kind === "hatch" ? -len * 0.08 : kind === "mpv" ? -len * 0.05 : -len * 0.04;
  const base = 0.32;
  const parts: Part[] = [
    ...wheels(len, width, 0.32),
    box([width, bodyH, len], [0, base + bodyH / 2, 0], body),
    box([width - 0.12, cabinH, cabinLen], [0, base + bodyH + cabinH / 2, cabinZ], body),
    box([width - 0.08, cabinH * 0.7, cabinLen - 0.25], [0, base + bodyH + cabinH * 0.45, cabinZ], GLASS, { outline: false }),
    box([width - 0.28, cabinH * 0.68, cabinLen + 0.04], [0, base + bodyH + cabinH * 0.45, cabinZ], GLASS, { outline: false }),
    box([0.3, 0.14, 0.04], [width / 2 - 0.3, base + bodyH * 0.7, len / 2 + 0.01], LIGHT, { outline: false }),
    box([0.3, 0.14, 0.04], [-width / 2 + 0.3, base + bodyH * 0.7, len / 2 + 0.01], LIGHT, { outline: false }),
    box([0.3, 0.14, 0.04], [width / 2 - 0.3, base + bodyH * 0.7, -len / 2 - 0.01], TAIL, { outline: false }),
    box([0.3, 0.14, 0.04], [-width / 2 + 0.3, base + bodyH * 0.7, -len / 2 - 0.01], TAIL, { outline: false }),
  ];
  if (kind === "taxi") {
    // White lower half and a roof sign
    parts.push(box([width + 0.02, 0.25, len + 0.02], [0, base + 0.18, 0], "#f7f5ef", { outline: false }));
    parts.push(box([0.7, 0.22, 0.3], [0, base + bodyH + cabinH + 0.11, cabinZ], "#fcd34d"));
  }
  return parts;
}

export function vanParts(brand: Brand): Part[] {
  const { len, width } = VEHICLE_SIZE.van;
  const c = BRANDS[brand];
  return [
    ...wheels(len, width, 0.34),
    box([width, 0.7, len], [0, 0.7, 0], "#f7f5ef"),
    box([width, 1.25, len * 0.68], [0, 1.65, -len * 0.14], "#f7f5ef"),
    box([width + 0.02, 0.5, len * 0.68], [0, 1.45, -len * 0.14], c.main, { outline: false }),
    box([width - 0.1, 0.7, len * 0.26], [0, 1.4, len * 0.33], c.main),
    box([width - 0.2, 0.5, 0.05], [0, 1.5, len * 0.46], GLASS, { outline: false }),
    box([0.3, 0.14, 0.04], [width / 2 - 0.3, 0.8, len / 2 + 0.01], LIGHT, { outline: false }),
    box([0.3, 0.14, 0.04], [-width / 2 + 0.3, 0.8, len / 2 + 0.01], LIGHT, { outline: false }),
  ];
}

/** Brand-name panel on the van's sides: centre and size, in the van's local frame. */
export const VAN_LABEL = { y: 2.0, z: -VEHICLE_SIZE.van.len * 0.14, w: 2.6, h: 0.5, x: VEHICLE_SIZE.van.width / 2 + 0.02 };

/** Motorbike with a rider in brand colours and a delivery box (ride bikes have no box). */
export function bikeParts(brand: Brand, skin: string, box_ = true): Part[] {
  const c = BRANDS[brand];
  const parts: Part[] = [
    cyl(0.3, 0.3, 0.12, [0, 0.3, 0.62], TYRE, { rotZ: Math.PI / 2 }),
    cyl(0.3, 0.3, 0.12, [0, 0.3, -0.62], TYRE, { rotZ: Math.PI / 2 }),
    box([0.34, 0.36, 1.1], [0, 0.6, 0], "#2a2a33"),
    box([0.42, 0.3, 0.5], [0, 0.72, 0.42], c.main),
    box([0.3, 0.12, 0.7], [0, 0.85, -0.15], "#1f1f24"),
    box([0.7, 0.06, 0.06], [0, 1.15, 0.6], "#4b5563"),
    // Rider: legs, jacket, arms, head, helmet
    box([0.36, 0.45, 0.25], [0, 0.95, 0.15], "#2a2a33"),
    box([0.46, 0.6, 0.32], [0, 1.4, -0.12], c.main),
    box([0.12, 0.12, 0.55], [0.26, 1.42, 0.25], c.main),
    box([0.12, 0.12, 0.55], [-0.26, 1.42, 0.25], c.main),
    ball(0.17, [0, 1.86, -0.08], skin),
    ball(0.22, [0, 1.94, -0.1], c.dark),
    box([0.3, 0.08, 0.04], [0, 1.9, 0.12], "#2a2a33", { outline: false }),
  ];
  if (box_) {
    parts.push(box([0.55, 0.5, 0.5], [0, 1.3, -0.68], c.main));
    parts.push(box([0.5, 0.12, 0.45], [0, 1.4, -0.68], "#ffffff", { outline: false }));
  }
  return parts;
}
