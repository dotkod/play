export const SENTRAL_LEPAK = {
  id: "sentral-lepak" as const,
  name: { ms: "Sentral Lepak", en: "Sentral Lepak" },
  origin: { x: -40, z: -48 },
  chunkSize: 64,
  neighbours: ["pusat-lepak", "klcc", "menara-lepak"] as const,
};

export const SENTRAL_BUS_STOP = { x: -32, z: -40 };
export const SENTRAL_HALL = { x: -42, z: -52 };
