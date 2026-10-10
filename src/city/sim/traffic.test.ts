import { describe, expect, it } from "vitest";
import { LANES } from "../plan";
import { createTraffic, signalFor, stepTraffic, vehicleCircles } from "./traffic";

const DT = 1 / 30;
const SECONDS = 180;

function run(count: number, seed: number) {
  const tr = createTraffic(LANES, count, seed);
  let overlaps = 0;
  let redRuns = 0;
  const overlapPairs = new Set<string>();
  const travelled = new Map<number, number>();
  const wasTurning = new Map<number, boolean>();
  let t = 0;
  for (let step = 0; step < SECONDS / DT; step++) {
    t += DT;
    const before = tr.vehicles.map((v) => ({ id: v.id, x: v.x, z: v.z }));
    stepTraffic(tr, DT, t, []);
    for (const [i, v] of tr.vehicles.entries()) {
      travelled.set(v.id, (travelled.get(v.id) ?? 0) + Math.hypot(v.x - before[i].x, v.z - before[i].z));
      // Entering a signalled junction on red (other than finishing an amber) counts as a run
      if (v.turn && !wasTurning.get(v.id) && v.lane.to.signal) {
        const axis = v.lane.dir.x !== 0 ? "x" : "z";
        if (signalFor(v.lane.to, axis, t) === "red" && signalFor(v.lane.to, axis, t - 1.5) === "red") redRuns++;
      }
      wasTurning.set(v.id, !!v.turn);
    }
    // Body overlap between different vehicles (circles shrink a little for tolerance)
    const circles = tr.vehicles.map((v) => ({ v, cs: vehicleCircles({ ...tr, vehicles: [v] }) }));
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const hit = circles[i].cs.some((a) => circles[j].cs.some((b) => Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r - 0.45));
        if (hit) {
          overlaps++;
          overlapPairs.add(`${circles[i].v.id}-${circles[j].v.id}`);
        }
      }
    }
  }
  const distances = [...travelled.values()];
  return { overlaps, overlapPairs, redRuns, minDist: Math.min(...distances), avg: distances.reduce((a, b) => a + b, 0) / distances.length };
}

describe.each([7, 21, 99, 2026])("traffic (seed %i)", (seed) => {
  const r = run(30, seed);

  it("vehicles never drive through each other", () => {
    expect([...r.overlapPairs]).toEqual([]);
  });

  it("nobody runs a red light", () => {
    expect(r.redRuns).toBe(0);
  });

  it("traffic keeps flowing (no gridlock)", () => {
    // Every vehicle covers real distance; the fleet averages a sensible speed
    expect(r.minDist).toBeGreaterThan(150);
    expect(r.avg / SECONDS).toBeGreaterThan(2.5);
  });
});
