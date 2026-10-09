export const TAMAN_CERIA = {
  id: "taman-ceria" as const,
  name: { ms: "Taman Ceria", en: "Taman Ceria" },
  /** World-space centre of the housing strip. */
  origin: { x: 110, z: 0 },
  chunkSize: 64,
  neighbours: ["pusat-lepak"] as const,
};

export const TAMAN_BUS_STOP = { x: 100, z: 5.6 };
export const TAMAN_HOME = { id: "home-ceria", x: 118, z: -7.2 };
export const TAMAN_SOFA = { x: 118, z: -5.4 };
