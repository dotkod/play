import { describe, expect, it, beforeEach } from "vitest";
import { STATIONS } from "../plan";
import { getShuttle, resetShuttle, tickShuttle } from "./shuttle";

describe("lrt shuttle", () => {
  beforeEach(() => {
    resetShuttle();
  });

  it("starts dwelling at pusat with doors open", () => {
    const st = getShuttle();
    expect(st.phase).toBe("dwell");
    expect(st.doorsOpen).toBe(true);
    expect(st.atStopId).toBe("pusat");
    expect(st.speed).toBe(0);
  });

  it("never opens doors while moving", () => {
    const st = getShuttle();
    // Finish dwell (DWELL_S is 12)
    tickShuttle(13);
    expect(st.phase).toBe("cruise");
    expect(st.doorsOpen).toBe(false);
    for (let i = 0; i < 200; i++) {
      tickShuttle(0.05);
      if (st.phase === "cruise") expect(st.doorsOpen).toBe(false);
    }
  });

  it("visits all three stops on a full east-then-west run", () => {
    const seen = new Set<string>();
    const st = getShuttle();
    for (let i = 0; i < 8000 && seen.size < 3; i++) {
      tickShuttle(0.05);
      if (st.atStopId) seen.add(st.atStopId);
    }
    expect([...seen].sort()).toEqual(["pusat", "selatan", "utara"].sort());
    expect(STATIONS.map((s) => s.id)).toEqual(["utara", "pusat", "selatan"]);
  });

  it("path position stays within guideway while cruising", () => {
    const st = getShuttle();
    tickShuttle(13);
    for (let i = 0; i < 400; i++) {
      tickShuttle(0.05);
      expect(st.s).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(st.x)).toBe(true);
    }
  });
});
