export const KAMPUNG_LEPAK = {
  id: "kampung-lepak" as const,
  name: { ms: "Kampung Lepak", en: "Kampung Lepak" },
  origin: { x: -62, z: 48 },
  chunkSize: 64,
  neighbours: ["pusat-lepak", "menara-lepak"] as const,
};

export const KAMPUNG_BUS_STOP = { x: -55, z: 38 };
export const KAMPUNG_CENTRE = { x: -65, z: 50 };
