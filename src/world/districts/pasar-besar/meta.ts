export const PASAR_BESAR = {
  id: "pasar-besar" as const,
  name: { ms: "Pasar Besar", en: "Pasar Besar" },
  origin: { x: 0, z: 58 },
  chunkSize: 64,
  neighbours: ["pusat-lepak", "bukit-jalan"] as const,
};

export const PASAR_BUS_STOP = { x: 0, z: 48 };
export const PASAR_HALL = { x: 0, z: 60 };
