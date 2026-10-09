import { makeChunkAABB, type ChunkAABB } from "../../chunk-manager";
import { TAMAN_CERIA, TAMAN_FRONT, TAMAN_HOME } from "./meta";

export type Terrace = {
  id: string;
  x: number;
  /** Building centre Z (north of arterial). */
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  roof: string;
  home?: boolean;
};

/** Even terraced row — south face flush with TAMAN_FRONT, doors toward the street (+z). */
function row(d: number) {
  return -TAMAN_FRONT - d / 2;
}

export const TERRACES: Terrace[] = [
  { id: "t1", x: 94, z: row(7), w: 6.2, d: 7, h: 5.2, color: "#f5d0a9", roof: "#8b5a3c" },
  { id: "t2", x: 101, z: row(7), w: 6.2, d: 7, h: 5.0, color: "#e8c4a0", roof: "#6b4a32" },
  { id: "t3", x: 108, z: row(7), w: 6.2, d: 7, h: 5.4, color: "#f2c46b", roof: "#7a4e2e" },
  {
    id: TAMAN_HOME.id,
    x: TAMAN_HOME.x,
    z: TAMAN_HOME.z,
    w: 7,
    d: 8,
    h: 5.8,
    color: "#f4efe4",
    roof: "#5c4030",
    home: true,
  },
  { id: "t5", x: 124, z: row(7), w: 6.2, d: 7, h: 5.1, color: "#c5e1a5", roof: "#4a6741" },
];

export const PLAYGROUND = { x: 105, z: 12, w: 14, d: 10 };

/** Continuous porch / five-foot way in front of the terrace row. */
export const TERRACE_WALK = { x0: 90, x1: 128, z: -TAMAN_FRONT + 1.35 };

export function tamanChunks(): ChunkAABB[] {
  const id = TAMAN_CERIA.id;
  const size = TAMAN_CERIA.chunkSize;
  // ix 1 and 2 cover x 64–192
  return [
    makeChunkAABB(1, -1, id, 8, size),
    makeChunkAABB(1, 0, id, 8, size),
    makeChunkAABB(2, -1, id, 8, size),
    makeChunkAABB(2, 0, id, 8, size),
  ];
}
