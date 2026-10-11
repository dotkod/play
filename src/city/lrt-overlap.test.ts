import { describe, expect, it } from "vitest";
import { BUILDINGS, GRID, overlap, type Rect } from "./plan";
import { STATIONS, TRACK_Z, samplePath } from "@/lrt/plan";

/** Station elevated deck + concourse footprint (xz). */
function stationDeck(st: (typeof STATIONS)[number]): Rect {
  return {
    minX: st.platform.minX,
    maxX: st.platform.maxX,
    minZ: st.platform.minZ,
    maxZ: st.concourse.maxZ,
  };
}

describe("LRT vs city solids", () => {
  it("shuttle path stays on TRACK_Z, not through the city centre", () => {
    for (const st of STATIONS) expect(samplePath(st.s).z).toBe(TRACK_Z);
  });

  it("elevated decks and street plazas do not intersect building footprints", () => {
    const hits: string[] = [];
    for (const st of STATIONS) {
      const deck = stationDeck(st);
      for (const b of BUILDINGS) {
        if (overlap(deck, b.rect) > 0.05) hits.push(`${st.id} deck ∩ ${b.id}`);
        if (overlap(st.street, b.rect) > 0.05) hits.push(`${st.id} street ∩ ${b.id}`);
      }
      for (const blk of GRID.blocks) {
        if (overlap(deck, blk.lot) > 0.05) hits.push(`${st.id} deck ∩ lot ${blk.id}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
