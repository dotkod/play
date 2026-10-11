/** Touch n Lepak fare gate (parody): readers + flap. Built at origin, +z = walk-through. */

import { box, type Part } from "@/city/kit/merge";
import { LINE_COLOR } from "../plan/constants";

const METAL = "#5a5a62";
const READER = "#1f1f24";
const PAD = "#22c55e";

export function gateParts(): Part[] {
  return [
    // Side cabinets
    box([0.45, 1.1, 0.7], [-0.7, 0.55, 0], METAL),
    box([0.45, 1.1, 0.7], [0.7, 0.55, 0], METAL),
    // Readers
    box([0.2, 0.35, 0.12], [-0.7, 1.05, 0.28], READER),
    box([0.2, 0.35, 0.12], [0.7, 1.05, 0.28], READER),
    box([0.14, 0.14, 0.04], [-0.7, 1.05, 0.36], PAD, { outline: false }),
    box([0.14, 0.14, 0.04], [0.7, 1.05, 0.36], PAD, { outline: false }),
    // Top beam
    box([1.9, 0.12, 0.2], [0, 1.2, 0], LINE_COLOR),
  ];
}

export function gateFlapParts(): Part[] {
  return [box([1.0, 0.85, 0.06], [0, 0.55, 0], "#94a3b8")];
}
