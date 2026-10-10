/**
 * Street furniture models, built at the origin with +z as the front (lamp arms and bus
 * shelters open toward +z). Rendered with instancing: one mesh per model for the whole city.
 */

import type { PropKind } from "../plan/props";
import { ball, box, cyl, type Part } from "./merge";

const METAL = "#4b5563";
const DARK = "#2a2a33";
const WOOD = "#b07a45";
const STONE = "#cfc8bb";

export function lampParts(): Part[] {
  return [
    cyl(0.17, 0.2, 0.4, [0, 0.2, 0], METAL),
    cyl(0.08, 0.1, 5.6, [0, 2.8, 0], METAL),
    box([0.09, 0.09, 1.7], [0, 5.55, 0.8], METAL),
    box([0.52, 0.16, 0.32], [0, 5.45, 1.6], DARK),
  ];
}

/** The lit lens under the lamp head (glow material, shown at dusk and night). */
export function lampGlowParts(): Part[] {
  return [box([0.44, 0.04, 0.26], [0, 5.35, 1.6], "#fff1c4")];
}

const GREENS = ["#2f8f4e", "#3a9d5a", "#2a7d46"];

export function treeParts(variant: number, pit = true): Part[] {
  const green = GREENS[variant % GREENS.length];
  const parts: Part[] = [cyl(0.12, 0.17, 1.8, [0, 0.9, 0], "#6b4423")];
  if (pit) parts.push(box([1.1, 0.06, 1.1], [0, 0.03, 0], "#4a3a2c", { outline: false }));
  if (variant % 3 === 0) {
    parts.push(ball(1.25, [0, 2.7, 0], green));
    parts.push(ball(0.8, [0.6, 3.3, 0.3], shadeGreen(green)));
  } else if (variant % 3 === 1) {
    parts.push(ball(0.95, [-0.4, 2.5, 0], green));
    parts.push(ball(1.0, [0.45, 2.9, -0.2], shadeGreen(green)));
    parts.push(ball(0.7, [0, 3.5, 0.3], green));
  } else {
    parts.push(cyl(0, 1.2, 2.8, [0, 3.1, 0], green, { segments: 10 }));
    parts.push(cyl(0, 0.9, 1.8, [0, 4.3, 0], shadeGreen(green), { segments: 10 }));
  }
  return parts;
}

function shadeGreen(c: string) {
  return c === "#2f8f4e" ? "#3fa862" : c === "#3a9d5a" ? "#2f8448" : "#36925a";
}

export function benchParts(): Part[] {
  return [
    box([1.6, 0.08, 0.45], [0, 0.46, 0], WOOD),
    box([1.6, 0.4, 0.07], [0, 0.78, -0.2], WOOD),
    box([0.08, 0.46, 0.4], [-0.7, 0.23, 0], METAL),
    box([0.08, 0.46, 0.4], [0.7, 0.23, 0], METAL),
  ];
}

export function binParts(): Part[] {
  return [cyl(0.3, 0.26, 0.85, [0, 0.43, 0], "#2f8f4e"), cyl(0.33, 0.33, 0.08, [0, 0.89, 0], "#226b3a")];
}

export function planterParts(): Part[] {
  return [box([2.2, 0.6, 1.0], [0, 0.3, 0], STONE), box([2.0, 0.06, 0.8], [0, 0.61, 0], "#5a4030", { outline: false })];
}

export function busStopParts(): Part[] {
  return [
    box([4.0, 0.12, 1.2], [0, 2.5, 0], "#1f5fa8"),
    box([4.0, 1.9, 0.06], [0, 1.3, -0.55], "#bcd9e6", { outline: false }),
    box([0.1, 2.5, 0.1], [-1.9, 1.25, -0.53], METAL),
    box([0.1, 2.5, 0.1], [1.9, 1.25, -0.53], METAL),
    box([3.0, 0.08, 0.4], [0, 0.48, -0.3], WOOD),
    box([0.08, 0.48, 0.34], [-1.3, 0.24, -0.3], METAL),
    box([0.08, 0.48, 0.34], [1.3, 0.24, -0.3], METAL),
    // Route sign on the roof edge
    box([0.8, 0.5, 0.06], [1.6, 2.85, 0.5], "#fcd34d"),
    box([0.56, 0.18, 0.07], [1.6, 2.87, 0.5], "#1f5fa8", { outline: false }),
  ];
}

export function fountainParts(): Part[] {
  return [
    cyl(2.4, 2.5, 0.5, [0, 0.25, 0], STONE),
    cyl(2.1, 2.1, 0.06, [0, 0.47, 0], "#6ec4e8", { outline: false }),
    cyl(0.35, 0.45, 1.2, [0, 1.0, 0], STONE),
    cyl(0.9, 0.5, 0.25, [0, 1.65, 0], STONE),
    cyl(0.75, 0.75, 0.05, [0, 1.78, 0], "#8fd4ef", { outline: false }),
  ];
}

export function playgroundParts(): Part[] {
  return [
    box([6, 0.05, 4], [0, 0.025, 0], "#e8a87c", { outline: false }),
    // Slide tower and ramp
    box([1.4, 1.6, 1.4], [-1.6, 0.8, -0.6], "#f2c46b"),
    box([0.9, 0.1, 2.8], [-1.6, 0.85, 1.3], "#d8352a", { rotX: 0.5 }),
    // Swing frame
    box([0.12, 2.2, 0.12], [1.0, 1.1, -1.2], "#2f6fd6"),
    box([0.12, 2.2, 0.12], [2.7, 1.1, -1.2], "#2f6fd6"),
    box([1.84, 0.12, 0.12], [1.85, 2.2, -1.2], "#2f6fd6"),
    box([0.5, 0.06, 0.25], [1.5, 0.6, -1.2], DARK),
    box([0.5, 0.06, 0.25], [2.2, 0.6, -1.2], DARK),
    box([0.03, 1.6, 0.03], [1.5, 1.4, -1.2], METAL, { outline: false }),
    box([0.03, 1.6, 0.03], [2.2, 1.4, -1.2], METAL, { outline: false }),
  ];
}

export function signalPoleParts(): Part[] {
  return [cyl(0.08, 0.1, 3.6, [0, 1.8, 0], METAL), box([0.36, 1.05, 0.28], [0, 3.05, 0], DARK), box([0.42, 0.06, 0.34], [0, 3.6, 0.03], DARK)];
}

/** Bulb positions on a signal head, in the pole's local frame (front = +z). */
export const BULBS = [
  { color: "red", y: 3.38 },
  { color: "amber", y: 3.05 },
  { color: "green", y: 2.72 },
] as const;

export const PROP_MODELS: Partial<Record<PropKind, () => Part[]>> = {
  lamp: lampParts,
  bench: benchParts,
  bin: binParts,
  planter: planterParts,
  busStop: busStopParts,
  fountain: fountainParts,
  playground: playgroundParts,
};
