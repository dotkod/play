import { PETALING_STREET } from "./meta";

/** Chinatown-row shophouse — faces the N–S street at PETALING_STREET.x. */
export type PetalingShop = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** +1 = west row facing street (+X); −1 = east row facing street (−X). */
  faceX: 1 | -1;
  color: string;
  awning: string;
  sign: string;
  signBg: string;
};

// Far enough from the N–S carriageway (±LANE 1.5 + car half-width) so traffic doesn’t clip shops.
// Centres ≥6m apart so 5m awnings don’t z-fight; last shop maxZ ≤ -34.2 clears the spur.
const WEST_X = PETALING_STREET.x - 6.2;
const EAST_X = PETALING_STREET.x + 6.2;
const Z_ROW = [-53.5, -47.5, -41.5, -36.5] as const;

const WEST: Omit<PetalingShop, "id" | "x" | "z" | "faceX">[] = [
  { w: 5.0, d: 4.2, h: 6.2, color: "#f3e4d0", awning: "#c8372b", sign: "KEDAI EMAS", signBg: "#8b1a14" },
  { w: 5.0, d: 4.2, h: 5.6, color: "#efe0c8", awning: "#1f6b4a", sign: "DIM SUM HO", signBg: "#163d2c" },
  { w: 5.0, d: 4.2, h: 6.8, color: "#f6e8d4", awning: "#c45c12", sign: "KOPITIAM AH", signBg: "#7a3208" },
  { w: 5.0, d: 4.2, h: 5.4, color: "#ead9c0", awning: "#2f5fad", sign: "UBAT TRADISI", signBg: "#1a3566" },
];

const EAST: Omit<PetalingShop, "id" | "x" | "z" | "faceX">[] = [
  { w: 5.0, d: 4.2, h: 5.8, color: "#f0dcc8", awning: "#c8372b", sign: "BAJU RAYA", signBg: "#8b1a14" },
  { w: 5.0, d: 4.2, h: 6.4, color: "#f5e6d3", awning: "#d4a017", sign: "GULI & MAINAN", signBg: "#7a5a0a" },
  { w: 5.0, d: 4.2, h: 5.5, color: "#ebe0ce", awning: "#6b3fa0", sign: "KEDAI HERBA", signBg: "#3d2460" },
  { w: 5.0, d: 4.2, h: 6.0, color: "#f2e2cc", awning: "#c8372b", sign: "TAU FU FA", signBg: "#8b1a14" },
];

export const PETALING_SHOPS: PetalingShop[] = [
  ...WEST.map((s, i) => ({
    ...s,
    id: `petaling-w${i}`,
    x: WEST_X,
    z: Z_ROW[i],
    faceX: 1 as const,
  })),
  ...EAST.map((s, i) => ({
    ...s,
    id: `petaling-e${i}`,
    x: EAST_X,
    z: Z_ROW[i],
    faceX: -1 as const,
  })),
];

export function petalingFootprint(s: PetalingShop) {
  return {
    minX: s.x - s.w / 2,
    maxX: s.x + s.w / 2,
    minZ: s.z - s.d / 2,
    maxZ: s.z + s.d / 2,
    cx: s.x,
    cz: s.z,
    front: s.x + s.faceX * (s.w / 2),
  };
}
