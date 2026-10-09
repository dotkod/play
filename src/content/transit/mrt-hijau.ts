/** MRT Laluan Hijau — green line (Kajang-inspired). */

import { type RailLine, type RailStation, stationById, stationNear } from "./rail";

export type MrtStationId = "sentral-lepak" | "bukit-bintik" | "tlx" | "pasar-besar" | "bukit-jalan";

export const MRT_FARE_SEN = 140; // RM1.40

export const MRT_STATIONS: RailStation[] = [
  {
    id: "sentral-lepak",
    place: "mrt-sentral",
    label: { ms: "Sentral Lepak", en: "Sentral Lepak" },
    x: -44,
    z: -44,
    exitX: -42.5,
    exitZ: -44,
    exitRotY: Math.PI / 2,
    district: "sentral-lepak",
  },
  {
    id: "bukit-bintik",
    place: "mrt-bintik",
    label: { ms: "Bukit Bintik", en: "Bukit Bintik" },
    x: 52,
    z: 18,
    exitX: 50.5,
    exitZ: 18,
    exitRotY: -Math.PI / 2,
    district: "bukit-bintik",
  },
  {
    id: "tlx",
    place: "mrt-tlx",
    label: { ms: "TLX", en: "TLX" },
    x: 66,
    z: -70,
    exitX: 66,
    exitZ: -68.5,
    exitRotY: 0,
    district: "tlx",
  },
  {
    id: "pasar-besar",
    place: "mrt-pasar",
    label: { ms: "Pasar Besar", en: "Pasar Besar" },
    x: 8,
    z: 48,
    exitX: 8,
    exitZ: 49.5,
    exitRotY: 0,
    district: "pasar-besar",
  },
  {
    id: "bukit-jalan",
    place: "mrt-jalan",
    label: { ms: "Bukit Jalan", en: "Bukit Jalan" },
    x: 22,
    z: 82,
    exitX: 20.5,
    exitZ: 82,
    exitRotY: -Math.PI / 2,
    district: "bukit-jalan",
  },
];

export const MRT_LINE: RailLine = {
  id: "mrt",
  name: { ms: "MRT Laluan Hijau", en: "MRT Green Line" },
  color: "#1f8a4c",
  emoji: "🟢",
  fareSen: MRT_FARE_SEN,
  fareLabel: { ms: "Tiket MRT", en: "MRT ticket" },
  stations: MRT_STATIONS,
};

export function mrtStationById(id: MrtStationId) {
  return stationById(MRT_STATIONS, id)!;
}

export function mrtStationNear(x: number, z: number, radius = 2.8) {
  return stationNear(MRT_STATIONS, x, z, radius);
}
