export const MENARA_LEPAK = {
  id: "menara-lepak" as const,
  name: { ms: "Menara Lepak", en: "Menara Lepak" },
  origin: { x: -90, z: 0 },
  chunkSize: 64,
  neighbours: ["pusat-lepak"] as const,
};

/** North edge stays clear of the west arterial (asphalt reaches z=-3). */
export const TOWER_POS = { x: -92, z: -8.5 };
export const MENARA_BUS_STOP = { x: -68, z: 5.6 };
export const MENARA_HILL = { x: -90, z: -4, r: 22 };
/** Square base of the tower (world metres). */
export const MENARA_BASE = 10;
