export const SENTRAL_LEPAK = {
  id: "sentral-lepak" as const,
  name: { ms: "Sentral Lepak", en: "Sentral Lepak" },
  origin: { x: -40, z: -48 },
  chunkSize: 64,
  neighbours: ["pusat-lepak", "klcc", "menara-lepak"] as const,
};

export const SENTRAL_BUS_STOP = { x: -32, z: -40 };
/** Hall sits south of the spur end (asphalt stops at z≈-53), entrance facing the road. */
export const SENTRAL_HALL = { x: -42, z: -63 };
/** Station hall footprint, centred on SENTRAL_HALL. */
export const SENTRAL_HALL_SIZE = { w: 28, d: 16 };
