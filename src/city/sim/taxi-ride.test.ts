import { afterEach, describe, expect, it } from "vitest";
import { LANES } from "../plan";
import { TAXI_NEAR_M, taxiDestById, taxiDestChoices, taxiDestinations, TAXI_FARE_SEN } from "./taxi-dests";
import { buildLanePath, laneChain, nearestLanePoint, resetTaxi, setTaxiPeers, startTaxiRide, taxi, tickTaxiRide } from "./taxi-ride";

afterEach(() => resetTaxi());

describe("taxi destinations", () => {
  it("lists Anne Maju and every LRT street pad", () => {
    const ids = taxiDestinations().map((d) => d.id);
    expect(ids).toContain("anne-maju");
    expect(ids).toContain("lrt-utara");
    expect(ids).toContain("lrt-pusat");
    expect(ids).toContain("lrt-selatan");
  });

  it("flat fare is RM3.50", () => {
    expect(TAXI_FARE_SEN).toBe(350);
  });

  it("drops destinations near the player", () => {
    const anne = taxiDestById("anne-maju")!;
    const near = taxiDestChoices(anne.x, anne.z);
    expect(near.every((d) => Math.hypot(d.x - anne.x, d.z - anne.z) >= TAXI_NEAR_M)).toBe(true);
    expect(near.some((d) => d.id === "anne-maju")).toBe(false);
  });
});

describe("lane path", () => {
  it("nearest lane point is on a lane segment", () => {
    const p = nearestLanePoint(0, 0);
    expect(p.dist).toBeLessThan(40);
    expect(LANES.some((l) => l.id === p.lane.id)).toBe(true);
  });

  it("builds a path between two sidewalk anchors", () => {
    const a = taxiDestById("anne-maju")!;
    const b = taxiDestById("lrt-pusat")!;
    const path = buildLanePath(a.x, a.z, b.x, b.z);
    expect(path.length).toBeGreaterThan(1);
    const end = path[path.length - 1]!;
    const drop = nearestLanePoint(b.x, b.z);
    expect(Math.hypot(end.x - drop.x, end.z - drop.z)).toBeLessThan(1);
  });

  it("laneChain finds a route across the grid", () => {
    const a = nearestLanePoint(-20, -20);
    const b = nearestLanePoint(40, 40);
    const chain = laneChain(a.lane, b.lane);
    expect(chain).not.toBeNull();
    expect(chain![0]!.id).toBe(a.lane.id);
    expect(chain![chain!.length - 1]!.id).toBe(b.lane.id);
  });
});

describe("taxi ride session", () => {
  function refs(x: number, z: number) {
    return {
      p: { x, z },
      rot: { current: 0 },
      moving: { current: false },
      seated: { current: false },
      floorY: { current: 0 },
      stride: { current: { dist: 0, alt: false } },
    };
  }

  it("orders → arrives → boards → rides → alights on sidewalk", () => {
    const dest = taxiDestById("lrt-pusat")!;
    const start = taxiDestById("anne-maju")!;
    expect(startTaxiRide(dest.id, start.x, start.z)).toBe(true);
    expect(taxi.phase).toBe("arriving");

    const r = refs(start.x, start.z);
    let guard = 0;
    while (taxi.phase === "arriving" && guard++ < 800) tickTaxiRide(r, 0.05);
    expect(taxi.phase).toBe("boarding");

    guard = 0;
    while (taxi.phase === "boarding" && guard++ < 1600) tickTaxiRide(r, 0.05);
    expect(taxi.phase).toBe("riding");
    expect(r.seated.current).toBe(true);

    guard = 0;
    while (taxi.phase === "riding" && guard++ < 2000) tickTaxiRide(r, 0.05);
    expect(taxi.phase).toBe("alighting");

    guard = 0;
    while (taxi.phase !== "off" && guard++ < 1600) tickTaxiRide(r, 0.05);
    expect(taxi.phase).toBe("off");
    expect(Math.hypot(r.p.x - dest.x, r.p.z - dest.z)).toBeLessThan(0.5);
    expect(r.seated.current).toBe(false);
  });

  it("rejects a second order while busy", () => {
    const dest = taxiDestById("lrt-utara")!;
    const start = taxiDestById("anne-maju")!;
    expect(startTaxiRide(dest.id, start.x, start.z)).toBe(true);
    expect(startTaxiRide("lrt-selatan", start.x, start.z)).toBe(false);
  });

  it("waits behind a peer car instead of overlapping", () => {
    const dest = taxiDestById("lrt-pusat")!;
    const start = taxiDestById("anne-maju")!;
    expect(startTaxiRide(dest.id, start.x, start.z)).toBe(true);
    const r = refs(start.x, start.z);
    // Block the taxi with a car right in front
    setTaxiPeers([{ x: taxi.x + Math.sin(taxi.rotY) * 4, z: taxi.z + Math.cos(taxi.rotY) * 4, rot: taxi.rotY, len: 4.4, width: 1.8 }]);
    const x0 = taxi.x;
    const z0 = taxi.z;
    for (let i = 0; i < 40; i++) tickTaxiRide(r, 0.05);
    expect(Math.hypot(taxi.x - x0, taxi.z - z0)).toBeLessThan(0.5);
    setTaxiPeers([]);
  });
});
