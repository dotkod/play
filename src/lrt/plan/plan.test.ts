import { describe, expect, it } from "vitest";
import { DOOR_HALF, PLAT_EDGE_Z, PLATFORM_Y, TRACK_Z } from "./constants";
import { PATH_LENGTH, samplePath, stationS } from "./path";
import { SPAWN, STATIONS, floorYAt, inRect } from "./index";

describe("lrt plan", () => {
  it("has three stations ordered west to east along the path", () => {
    expect(STATIONS).toHaveLength(3);
    expect(STATIONS.map((s) => s.id)).toEqual(["utara", "pusat", "selatan"]);
    expect(STATIONS[0]!.s).toBeLessThan(STATIONS[1]!.s);
    expect(STATIONS[1]!.s).toBeLessThan(STATIONS[2]!.s);
    expect(STATIONS[0]!.x).toBeLessThan(STATIONS[1]!.x);
    expect(STATIONS[1]!.x).toBeLessThan(STATIONS[2]!.x);
  });

  it("station path marks match stationS", () => {
    for (const st of STATIONS) expect(st.s).toBe(stationS(st.index));
  });

  it("has a usable guideway length that fits the city", () => {
    expect(PATH_LENGTH).toBeGreaterThan(160);
    expect(PATH_LENGTH).toBeLessThan(220);
  });

  it("path samples sit on TRACK_Z (same as stations / guideway — not city centre z=0)", () => {
    for (const st of STATIONS) {
      const sample = samplePath(st.s);
      expect(sample.z).toBe(TRACK_Z);
      expect(Math.abs(sample.x - st.x)).toBeLessThan(0.01);
    }
  });

  it("spawns on the street outside pusat, not on the platform", () => {
    const pusat = STATIONS[1]!;
    expect(inRect(SPAWN.x, SPAWN.z, pusat.street)).toBe(true);
    expect(inRect(SPAWN.x, SPAWN.z, pusat.platform)).toBe(false);
  });

  it("each station has street, canopy, and platform name boards", () => {
    for (const st of STATIONS) {
      expect(st.nameBoards.some((b) => b.kind === "street")).toBe(true);
      expect(st.nameBoards.some((b) => b.kind === "canopy")).toBe(true);
      expect(st.nameBoards.filter((b) => b.kind === "platform")).toHaveLength(2);
      expect(st.serviceBoxes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("boarding apron over the guideway stays elevated", () => {
    const pusat = STATIONS[1]!;
    expect(floorYAt(pusat.x, TRACK_Z)).toBe(PLATFORM_Y);
    expect(floorYAt(pusat.x, TRACK_Z + 1.2)).toBe(PLATFORM_Y);
  });

  it("platform furniture sits on the deck, clear of the door bay", () => {
    for (const st of STATIONS) {
      expect(st.furniture.length).toBeGreaterThanOrEqual(2);
      expect(st.platform.minZ).toBe(PLAT_EDGE_Z);
      for (const f of st.furniture) {
        expect(inRect((f.minX + f.maxX) / 2, (f.minZ + f.maxZ) / 2, st.platform)).toBe(true);
        expect(f.minZ).toBeGreaterThan(PLAT_EDGE_Z + 1.1);
        const overlapsBay = f.maxX > st.x - DOOR_HALF && f.minX < st.x + DOOR_HALF;
        expect(overlapsBay).toBe(false);
      }
    }
  });
});
