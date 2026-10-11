import { describe, expect, it } from "vitest";
import { FARE_SEN_1, FARE_SEN_2, fareSenBetween, formatRm } from "./fare";

describe("lrt fare by distance", () => {
  it("charges one-hop and two-hop fares", () => {
    expect(fareSenBetween("utara", "pusat")).toBe(FARE_SEN_1);
    expect(fareSenBetween("pusat", "selatan")).toBe(FARE_SEN_1);
    expect(fareSenBetween("utara", "selatan")).toBe(FARE_SEN_2);
    expect(fareSenBetween("selatan", "utara")).toBe(FARE_SEN_2);
  });

  it("is free for the same station", () => {
    expect(fareSenBetween("pusat", "pusat")).toBe(0);
  });

  it("formats ringgit", () => {
    expect(formatRm(120)).toBe("RM1.20");
    expect(formatRm(200)).toBe("RM2.00");
  });
});
