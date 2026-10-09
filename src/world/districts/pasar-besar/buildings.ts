import { PASAR_HALL } from "./meta";

/** Market halls flanking the N–S arterial (never on the carriageway at x=0). */
export type PasarHall = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
};

export const PASAR_HALLS: PasarHall[] = [
  { id: "pasar-w", x: PASAR_HALL.x - 12, z: PASAR_HALL.z, w: 8, d: 14, h: 4.5, color: "#e8dcc8" },
  { id: "pasar-e", x: PASAR_HALL.x + 12, z: PASAR_HALL.z, w: 8, d: 14, h: 4.5, color: "#e8dcc8" },
  { id: "pasar-n", x: PASAR_HALL.x - 12, z: PASAR_HALL.z + 14, w: 8, d: 10, h: 4.5, color: "#f2c46b" },
];

export function pasarHallFootprint(h: PasarHall) {
  return {
    minX: h.x - h.w / 2,
    maxX: h.x + h.w / 2,
    minZ: h.z - h.d / 2,
    maxZ: h.z + h.d / 2,
  };
}
