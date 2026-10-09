export const PUSAT_LEPAK = {
  id: "pusat-lepak" as const,
  name: { ms: "Pusat Lepak", en: "Pusat Lepak" },
  origin: { x: 0, z: 0 },
  chunkSize: 64,
  /** Neighbour district ids (walk/bus). */
  neighbours: ["taman-ceria"] as const,
};
