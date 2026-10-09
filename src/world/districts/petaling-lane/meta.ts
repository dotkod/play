export const PETALING_LANE = {
  id: "petaling-lane" as const,
  name: { ms: "Petaling Lane", en: "Petaling Lane" },
  origin: { x: 28, z: -28 },
  chunkSize: 64,
  neighbours: ["pusat-lepak", "klcc"] as const,
};

export const PETALING_BUS_STOP = { x: 28, z: -18 };
export const PETALING_STREET = { x: 28, z: -30 };
