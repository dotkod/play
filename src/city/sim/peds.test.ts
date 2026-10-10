import { describe, expect, it } from "vitest";
import { COLLIDERS, grow, GRID, inRect } from "../plan";
import { onLoop, PED_PATH, PED_R, PED_SIDE } from "./peds";

describe("pedestrian paths", () => {
  it("both walking lanes stay on the sidewalk and clear of every collider", () => {
    const bad: string[] = [];
    for (const b of GRID.blocks) {
      const loop = grow(b.lot, PED_PATH);
      const per = 2 * (loop.maxX - loop.minX + loop.maxZ - loop.minZ);
      for (let s = 0; s < per; s += 0.25) {
        const q = onLoop(loop, s);
        for (const side of [-PED_SIDE, PED_SIDE]) {
          const x = q.x + q.hz * side;
          const z = q.z - q.hx * side;
          if (!GRID.sidewalks.some((w) => inRect(x, z, w))) bad.push(`${b.id} off sidewalk at (${x.toFixed(1)}, ${z.toFixed(1)})`);
          const box = COLLIDERS.boxes.find((c) => inRect(x, z, c.rect, PED_R));
          const circ = COLLIDERS.circles.find((c) => Math.hypot(x - c.x, z - c.z) < c.r + PED_R);
          if (box || circ) bad.push(`${b.id} hits ${(box ?? circ)!.id} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        }
      }
    }
    expect([...new Set(bad)].slice(0, 20)).toEqual([]);
  });
});
