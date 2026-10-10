import { describe, expect, it } from "vitest";
import type { Part } from "./merge";
import { carParts, type CarKind, vanParts } from "./vehicles";

type Box = { min: number[]; max: number[] };

/** Axis-aligned extent of a part (wheels are cylinders turned onto their side). */
function extent(p: Part): Box {
  let size: number[];
  if (p.shape === "box") size = p.size;
  else if (p.shape === "cyl") {
    const r = Math.max(p.top, p.bottom);
    size = p.rotZ ? [p.height, r * 2, r * 2] : [r * 2, p.height, r * 2];
  } else size = [p.radius * 2, p.radius * 2, p.radius * 2];
  return { min: p.pos.map((c, i) => c - size[i] / 2), max: p.pos.map((c, i) => c + size[i] / 2) };
}

const overlap = (a: Box, b: Box) => Math.min(...[0, 1, 2].map((i) => Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i])));
const isWheel = (p: Part) => p.shape === "cyl" && !!p.rotZ;

describe("vehicle models", () => {
  const models: [string, Part[]][] = [
    ...(["hatch", "sedan", "suv", "mpv", "taxi"] as CarKind[]).map((k): [string, Part[]] => [k, carParts(k, "#2f6fd6")]),
    ["van", vanParts("lalamoov")],
  ];
  it.each(models)("%s: tyres sit in wheel wells, clear of the body", (_, parts) => {
    const wheels = parts.filter(isWheel);
    const body = parts.filter((p) => !isWheel(p));
    expect(wheels.length).toBe(4);
    const hits = wheels.flatMap((w) => body.filter((b) => overlap(extent(w), extent(b)) > 0.005).map((b) => `${b.color} at ${b.pos.join(",")}`));
    expect(hits).toEqual([]);
  });
});
