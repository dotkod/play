import { LRT_FARE_SEN, LRT_STATIONS } from "./lrt-kelana";
import { MRT_LINE, MRT_STATIONS } from "./mrt-hijau";
import { MONO_LINE, MONO_STATIONS } from "./monorel";
import { type RailLine, type RailLineId, type RailStation, stationNear } from "./rail";

export type { RailLine, RailLineId, RailStation } from "./rail";
export { MRT_LINE, MRT_STATIONS, MRT_FARE_SEN, mrtStationById, mrtStationNear } from "./mrt-hijau";
export { MONO_LINE, MONO_STATIONS, MONO_FARE_SEN, monoStationById, monoStationNear } from "./monorel";

export const LRT_LINE: RailLine = {
  id: "lrt",
  name: { ms: "LRT Laluan Kelana", en: "LRT Kelana Line" },
  color: "#c62f25",
  emoji: "🚇",
  fareSen: LRT_FARE_SEN,
  fareLabel: { ms: "Tiket LRT", en: "LRT ticket" },
  stations: LRT_STATIONS,
};

export const RAIL_LINES: RailLine[] = [LRT_LINE, MRT_LINE, MONO_LINE];

export function railLineById(id: RailLineId) {
  return RAIL_LINES.find((l) => l.id === id)!;
}

/** Nearest station on any line (first match wins by proximity scan order). */
export function anyRailNear(x: number, z: number, radius = 2.8): { line: RailLine; station: RailStation } | null {
  let best: { line: RailLine; station: RailStation; d: number } | null = null;
  for (const line of RAIL_LINES) {
    const s = stationNear(line.stations, x, z, radius);
    if (!s) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (!best || d < best.d) best = { line, station: s, d };
  }
  return best ? { line: best.line, station: best.station } : null;
}

export const ALL_RAIL_STATIONS: RailStation[] = [...LRT_STATIONS, ...MRT_STATIONS, ...MONO_STATIONS];
