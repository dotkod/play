/** Moving lift cabin mesh (origin = cabin floor centre). Open N/S — shaft doors seal the openings. */

import { box, type Part } from "@/city/kit/merge";

const METAL = "#6b6f78";
const CREAM = "#f3efe4";
const GLASS = "#9ec4d4";
const INK = "#2a2520";

export function liftCabinParts(width: number, depth: number): Part[] {
  const w = Math.max(1.2, width - 0.2);
  const d = Math.max(1.2, depth - 0.2);
  const h = 2.35;
  return [
    // Floor + ceiling (cream — never a solid red mass)
    box([w, 0.08, d], [0, 0.04, 0], CREAM),
    box([w, 0.08, d], [0, h - 0.04, 0], CREAM),
    // Side walls only (east / west) — N/S open to the shaft doors
    box([0.07, h - 0.2, d - 0.15], [-w / 2 + 0.04, h / 2, 0], METAL),
    box([0.07, h - 0.2, d - 0.15], [w / 2 - 0.04, h / 2, 0], METAL),
    // Glass in side walls
    box([0.04, h - 0.7, d - 0.45], [-w / 2 + 0.05, h / 2, 0], GLASS, { outline: false }),
    box([0.04, h - 0.7, d - 0.45], [w / 2 - 0.05, h / 2, 0], GLASS, { outline: false }),
    // Handrail / panel
    box([0.28, 0.5, 0.06], [w / 2 - 0.28, 1.15, 0], INK),
    // Ceiling light strip
    box([w - 0.4, 0.04, 0.18], [0, h - 0.12, 0], METAL),
  ];
}

/** Sliding door leaf (local — placed by the shaft component). */
export function liftDoorLeafParts(doorW: number, doorH: number): Part[] {
  return [
    box([doorW, doorH, 0.06], [0, doorH / 2, 0], METAL),
    box([doorW - 0.12, doorH - 0.25, 0.04], [0, doorH / 2, 0.02], GLASS, { outline: false }),
  ];
}
