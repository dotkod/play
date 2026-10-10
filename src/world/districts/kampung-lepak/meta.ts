export const KAMPUNG_LEPAK = {
  id: "kampung-lepak" as const,
  name: { ms: "Kampung Lepak", en: "Kampung Lepak" },
  origin: { x: -62, z: 48 },
  chunkSize: 64,
  neighbours: ["pusat-lepak", "menara-lepak"] as const,
};

export const KAMPUNG_BUS_STOP = { x: -55, z: 38 };
export const KAMPUNG_CENTRE = { x: -65, z: 50 };
/** End of the village spur, between the houses (map marker, wayfinder target). */
export const KAMPUNG_ENTRANCE = { x: -62, z: 44 };
/** Stilt houses around the village centre (roof overhang included). */
export const KAMPUNG_HOUSES = [
  [-8, -4],
  [0, 2],
  [8, -2],
  [-4, 8],
  [6, 10],
].map(([dx, dz]) => ({ x: KAMPUNG_CENTRE.x + dx, z: KAMPUNG_CENTRE.z + dz, w: 4.8, d: 3.8 }));
