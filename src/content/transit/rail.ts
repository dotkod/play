/** Shared elevated-rail station shape (LRT / MRT / Monorel). */

export type RailStation = {
  id: string;
  place: string;
  label: { ms: string; en: string };
  x: number;
  z: number;
  exitX: number;
  exitZ: number;
  exitRotY: number;
  district: string;
};

export type RailLineId = "lrt" | "mrt" | "monorel";

export type RailLine = {
  id: RailLineId;
  name: { ms: string; en: string };
  color: string;
  emoji: string;
  fareSen: number;
  fareLabel: { ms: string; en: string };
  stations: RailStation[];
};

export function stationNear(stations: RailStation[], x: number, z: number, radius = 2.8) {
  for (const s of stations) {
    if (Math.hypot(s.x - x, s.z - z) < radius) return s;
  }
  return null;
}

export function stationById(stations: RailStation[], id: string) {
  return stations.find((s) => s.id === id) ?? null;
}
