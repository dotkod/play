import { describe, expect, it, beforeEach } from "vitest";
import { STATIONS } from "../plan";
import { resetShuttle, tickShuttle } from "./shuttle";
import { arrivalsAt, formatEta, towardFrom } from "./eta";

describe("lrt eta", () => {
  beforeEach(() => {
    resetShuttle();
  });

  it("shows train here at pusat on boot", () => {
    const rows = arrivalsAt(1);
    expect(rows[0]?.here).toBe(true);
    expect(rows[0]?.etaSec).toBe(0);
    expect(rows[0]?.towardIndex).toBe(2);
  });

  it("lists a following arrival after the current dwell", () => {
    const rows = arrivalsAt(1);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[1]!.etaSec).toBeGreaterThan(10);
  });

  it("updates when the train leaves for selatan", () => {
    tickShuttle(10); // leave dwell
    for (let i = 0; i < 40; i++) tickShuttle(0.2);
    const atPusat = arrivalsAt(1);
    expect(atPusat[0]?.here).toBeFalsy();
    const atSelatan = arrivalsAt(2);
    expect(atSelatan[0]?.etaSec).toBeLessThan(120);
  });

  it("towardFrom reverses at the ends", () => {
    expect(towardFrom(2, 1)).toBe(1);
    expect(towardFrom(0, -1)).toBe(1);
    expect(towardFrom(1, 1)).toBe(2);
  });

  it("formats eta for both languages", () => {
    expect(formatEta(3, "ms")).toBe("TIBA");
    expect(formatEta(3, "en")).toBe("DUE");
    expect(formatEta(90, "en")).toBe("2 min");
    expect(STATIONS).toHaveLength(3);
  });
});
