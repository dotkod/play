import { describe, expect, it } from "vitest";
import { GRID, STREETS, grow, inRect, overlap } from "./plan";
import { STATIONS, STREET_COLLIDERS } from "@/lrt/plan";

describe("LRT vs roads", () => {
  it("keeps street plazas, lift, concourse, shaft walls and pillars off asphalt", () => {
    const asphalt = [...GRID.segments.map((s) => s.rect), ...GRID.junctions.map((j) => j.rect)];
    const hits: string[] = [];
    for (const st of STATIONS) {
      const parts: [string, (typeof st)["street"]][] = [
        ["street", st.street],
        ["lift", st.lift],
        ["concourse", st.concourse],
        ...st.serviceBoxes.map((r, i): [string, (typeof st)["street"]] => [`shaft-${i}`, r]),
      ];
      for (const [name, r] of parts) {
        for (const road of asphalt) {
          if (overlap(r, road) > 0.05) hits.push(`${st.id} ${name} ∩ road`);
        }
      }
    }
    for (const c of STREET_COLLIDERS.boxes) {
      for (const r of asphalt) {
        if (overlap(c.rect, r) > 0.05) hits.push(`collider ${c.id} ∩ road`);
      }
    }
    for (const c of STREET_COLLIDERS.circles) {
      for (const r of asphalt) {
        if (inRect(c.x, c.z, r, c.r)) hits.push(`pillar ${c.id} on road`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("keeps city trees/lamps clear of LRT plazas", () => {
    const clear = STATIONS.flatMap((st) => [grow(st.street, 1.0), grow(st.lift, 0.6)]);
    const hits = STREETS.props
      .filter((p) => p.kind === "tree" || p.kind === "lamp")
      .filter((p) => clear.some((r) => inRect(p.x, p.z, r, 0.35)))
      .map((p) => p.id);
    expect(hits).toEqual([]);
  });
});
