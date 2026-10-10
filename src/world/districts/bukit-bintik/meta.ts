export const BUKIT_BINTIK = {
  id: "bukit-bintik" as const,
  name: { ms: "Bukit Bintik", en: "Bukit Bintik" },
  origin: { x: 48, z: 28 },
  chunkSize: 64,
  neighbours: ["pusat-lepak"] as const,
};

export const BINTIK_BUS_STOP = { x: 48, z: 5.8 };
export const BINTIK_STRIP = { x: 50, z: 22 };
/** Neon blocks along the strip (centre, footprint). */
export const BINTIK_BLOCKS = [-8, -2, 4, 10].map((dx) => ({ x: BINTIK_STRIP.x + dx, z: BINTIK_STRIP.z, w: 5.5, d: 6 }));
