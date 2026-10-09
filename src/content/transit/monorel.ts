/** Monorel Lepak — lime elevated loop. */

import { type RailLine, type RailStation, stationById, stationNear } from "./rail";

export type MonoStationId = "sentral-lepak" | "bukit-bintik" | "menara-lepak";

export const MONO_FARE_SEN = 100; // RM1.00

export const MONO_STATIONS: RailStation[] = [
  {
    id: "sentral-lepak",
    place: "mono-sentral",
    label: { ms: "Sentral Lepak", en: "Sentral Lepak" },
    x: -36,
    z: -54,
    exitX: -36,
    exitZ: -52.5,
    exitRotY: 0,
    district: "sentral-lepak",
  },
  {
    id: "bukit-bintik",
    place: "mono-bintik",
    label: { ms: "Bukit Bintik", en: "Bukit Bintik" },
    x: 44,
    z: 26,
    exitX: 44,
    exitZ: 24.5,
    exitRotY: Math.PI,
    district: "bukit-bintik",
  },
  {
    id: "menara-lepak",
    place: "mono-menara",
    label: { ms: "Menara Lepak", en: "Menara Lepak" },
    x: -86,
    z: 6,
    exitX: -84.5,
    exitZ: 6,
    exitRotY: Math.PI / 2,
    district: "menara-lepak",
  },
];

export const MONO_LINE: RailLine = {
  id: "monorel",
  name: { ms: "Monorel Lepak", en: "Lepak Monorail" },
  color: "#a3e635",
  emoji: "🚝",
  fareSen: MONO_FARE_SEN,
  fareLabel: { ms: "Tiket Monorel", en: "Monorail ticket" },
  stations: MONO_STATIONS,
};

export function monoStationById(id: MonoStationId) {
  return stationById(MONO_STATIONS, id)!;
}

export function monoStationNear(x: number, z: number, radius = 2.8) {
  return stationNear(MONO_STATIONS, x, z, radius);
}
