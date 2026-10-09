export const KLCC = {
  id: "klcc" as const,
  name: { ms: "KLCC Lepak", en: "KLCC Lepak" },
  origin: { x: 0, z: -100 },
  chunkSize: 64,
  neighbours: ["pusat-lepak"] as const,
};

/** Twin tower bases (world XZ). */
export const TOWER_L = { x: -9, z: -102 };
export const TOWER_R = { x: 9, z: -102 };
export const KLCC_FOUNTAIN = { x: 0, z: -88 };
export const KLCC_BUS_STOP = { x: 18, z: -86 };
export const KLCC_PARK = { x: 0, z: -92, w: 36, d: 28 };
