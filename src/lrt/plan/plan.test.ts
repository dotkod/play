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
    expect(PATH_LENGTH).toBeGreaterThan(120);
    expect(PATH_LENGTH).toBeLessThan(180);
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

  it("each station has one street fascia and two platform boards (no stacked canopy sign)", () => {
    for (const st of STATIONS) {
      expect(st.nameBoards.filter((b) => b.kind === "street")).toHaveLength(1);
      expect(st.nameBoards.filter((b) => b.kind === "canopy")).toHaveLength(0);
      expect(st.nameBoards.filter((b) => b.kind === "platform")).toHaveLength(2);
      expect(st.lift.maxX - st.lift.minX).toBeGreaterThan(2);
      expect(st.serviceBoxes.length).toBeGreaterThanOrEqual(6);
      // Lift stays in the street plaza — shaft clear of the station hall
      expect(st.lift.minZ).toBeGreaterThan(st.platform.maxZ + 1.2);
      expect(st.apron.maxZ).toBeLessThanOrEqual(st.lift.minZ + 0.01);
      expect(st.apron.minZ).toBeLessThanOrEqual(st.platform.maxZ + 0.01);
      // Fare walls seal the line — only gate aisles stay open
      expect(st.fareBarriers.length).toBe(3);
      for (const b of st.fareBarriers) {
        expect(b.maxX - b.minX).toBeGreaterThan(0.4);
        expect(inRect(st.entryGate.x, st.entryGate.z, b)).toBe(false);
        expect(inRect(st.exitGate.x, st.exitGate.z, b)).toBe(false);
      }
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
