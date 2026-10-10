export const BUKIT_JALAN = {
  id: "bukit-jalan" as const,
  name: { ms: "Bukit Jalan", en: "Bukit Jalan" },
  origin: { x: 12, z: 72 },
  chunkSize: 64,
  neighbours: ["pusat-lepak"] as const,
};

/** Bowl sits SE of the approach — not on the arterial or the z=76 spur. */
export const STADIUM = { x: 22, z: 100 };
/** Bus on the spur, west of the stadium turn. */
export const JALAN_BUS_STOP = { x: 6, z: 76 };
/** Stadium bowl collision radius — north approach along x=22 stays open. */
export const STADIUM_SOLID_R = 14.5;
/** Where the approach road meets the bowl (map marker, wayfinder target). */
export const STADIUM_GATE = { x: STADIUM.x, z: STADIUM.z - STADIUM_SOLID_R - 1.5 };
