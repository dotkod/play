/** LRT Laluan Kelana — red line stations (Phase 4a). */

export type LrtStationId = "pusat-lepak" | "klcc" | "kampung-lepak" | "sentral-lepak" | "taman-ceria";

export const LRT_FARE_SEN = 120; // RM1.20

export type LrtStation = {
  id: LrtStationId;
  place: string;
  label: { ms: string; en: string };
  /** Interact point (door). */
  x: number;
  z: number;
  exitX: number;
  exitZ: number;
  exitRotY: number;
  district: string;
};

export const LRT_STATIONS: LrtStation[] = [
  {
    id: "pusat-lepak",
    place: "lrt-pusat",
    label: { ms: "Pusat Lepak", en: "Pusat Lepak" },
    x: -19,
    z: 5.2,
    exitX: -19,
    exitZ: 4,
    exitRotY: Math.PI,
    district: "pusat-lepak",
  },
  {
    id: "klcc",
    place: "lrt-klcc",
    label: { ms: "KLCC", en: "KLCC" },
    x: -14,
    z: -90,
    exitX: -14,
    exitZ: -88.5,
    exitRotY: 0,
    district: "klcc",
  },
  {
    id: "kampung-lepak",
    place: "lrt-kampung",
    label: { ms: "Kampung Lepak", en: "Kampung Lepak" },
    x: -58,
    z: 44,
    exitX: -56.5,
    exitZ: 44,
    exitRotY: Math.PI / 2,
    district: "kampung-lepak",
  },
  {
    id: "sentral-lepak",
    place: "lrt-sentral",
    label: { ms: "Sentral Lepak", en: "Sentral Lepak" },
    x: -38,
    z: -48,
    exitX: -36.5,
    exitZ: -48,
    exitRotY: Math.PI / 2,
    district: "sentral-lepak",
  },
  {
    id: "taman-ceria",
    place: "lrt-taman",
    label: { ms: "Taman Ceria", en: "Taman Ceria" },
    x: 94,
    z: 8,
    exitX: 94,
    exitZ: 6.5,
    exitRotY: Math.PI,
    district: "taman-ceria",
  },
];

export function lrtStationById(id: LrtStationId) {
  return LRT_STATIONS.find((s) => s.id === id)!;
}

export function lrtStationNear(x: number, z: number, radius = 2.8) {
  for (const s of LRT_STATIONS) {
    if (Math.hypot(s.x - x, s.z - z) < radius) return s;
  }
  return null;
}
