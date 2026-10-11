import { describe, expect, it, beforeEach } from "vitest";
import { resetShuttle, tickShuttle, platformDoorsOpen, platformEdgeColliders } from "./shuttle";

describe("platform screen doors", () => {
  beforeEach(() => {
    resetShuttle();
  });

  it("opens only at the station where the train is dwelling", () => {
    expect(platformDoorsOpen("pusat")).toBe(true);
    expect(platformDoorsOpen("utara")).toBe(false);
    expect(platformDoorsOpen("selatan")).toBe(false);
  });

  it("leaves a boarding gap while open at pusat", () => {
    const pusat = platformEdgeColliders().filter((b) => b.id.startsWith("pusat-psd"));
    expect(pusat).toHaveLength(2);
    expect(pusat.some((b) => b.rect.minX < 0 && b.rect.maxX > 0)).toBe(false);
  });

  it("seals the edge when the train leaves", () => {
    tickShuttle(13);
    expect(platformDoorsOpen("pusat")).toBe(false);
    const sealed = platformEdgeColliders().find((b) => b.id === "pusat-psd");
    expect(sealed).toBeTruthy();
    expect(sealed!.rect.minX).toBeLessThan(-1);
    expect(sealed!.rect.maxX).toBeGreaterThan(1);
  });
});
