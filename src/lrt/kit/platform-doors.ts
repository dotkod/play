/** Platform screen doors: full-length side glass + mid posts + sliding bay + header. */

import { box, type Part } from "@/city/kit/merge";
import { DOOR_HALF, LINE_COLOR, PLATFORM_ALONG } from "../plan/constants";

const FRAME = "#2e3038";
const GLASS = "#8eb4c8";
const HEADER = "#1a1c22";

/** Fixed side screens beside the door bay (world parts at station). */
export function platformSideScreenParts(stX: number, platZ: number, y: number): Part[] {
  const half = PLATFORM_ALONG / 2;
  const bay = DOOR_HALF + 0.05;
  const sideW = half - bay;
  const h = 1.75;
  const midY = y + h / 2;
  const parts: Part[] = [
    box([sideW, h, 0.08], [stX - (bay + sideW / 2), midY, platZ], GLASS, { outline: false }),
    box([sideW, h, 0.08], [stX + (bay + sideW / 2), midY, platZ], GLASS, { outline: false }),
    // Bay posts
    box([0.14, h + 0.2, 0.16], [stX - bay, y + (h + 0.2) / 2, platZ], FRAME),
    box([0.14, h + 0.2, 0.16], [stX + bay, y + (h + 0.2) / 2, platZ], FRAME),
    // Header over door bay
    box([bay * 2 + 0.4, 0.22, 0.18], [stX, y + h + 0.2, platZ], HEADER),
    box([bay * 2 + 0.35, 0.05, 0.06], [stX, y + h + 0.32, platZ + 0.02], LINE_COLOR, { outline: false }),
    // Top rail across full platform
    box([PLATFORM_ALONG, 0.1, 0.12], [stX, y + h + 0.08, platZ], FRAME),
  ];
  // Mid posts every ~4 m along each side run
  for (const side of [-1, 1] as const) {
    const x0 = stX + side * (bay + 0.3);
    const x1 = stX + side * (half - 0.4);
    const span = Math.abs(x1 - x0);
    const n = Math.max(1, Math.floor(span / 4));
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const px = x0 + (x1 - x0) * t;
      parts.push(box([0.1, h + 0.15, 0.12], [px, y + (h + 0.15) / 2, platZ], FRAME));
    }
  }
  return parts;
}

/** One sliding leaf built at origin (centre of leaf at 0). */
export function platformDoorLeafParts(): Part[] {
  const leafW = DOOR_HALF - 0.08;
  const h = 1.65;
  return [
    box([leafW, h, 0.07], [0, h / 2, 0], GLASS, { outline: false }),
    box([0.06, h, 0.1], [-leafW / 2, h / 2, 0], FRAME),
    box([0.06, h, 0.1], [leafW / 2, h / 2, 0], FRAME),
    box([leafW, 0.08, 0.1], [0, h - 0.04, 0], FRAME),
    box([leafW, 0.08, 0.1], [0, 0.04, 0], FRAME),
  ];
}
