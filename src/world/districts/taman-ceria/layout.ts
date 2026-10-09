import { makeChunkAABB, type ChunkAABB } from "../../chunk-manager";
import { TAMAN_CERIA, TAMAN_HOME } from "./meta";

export type Terrace = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  home?: boolean;
};

export const TERRACES: Terrace[] = [
  { id: "t1", x: 92, z: -8, w: 6, d: 7, h: 5.5, color: "#f5d0a9" },
  { id: "t2", x: 100, z: -8, w: 6, d: 7, h: 5.2, color: "#e8c4a0" },
  { id: "t3", x: 108, z: -8, w: 6, d: 7, h: 5.8, color: "#f2c46b" },
  { id: TAMAN_HOME.id, x: TAMAN_HOME.x, z: TAMAN_HOME.z, w: 7, d: 8, h: 6, color: "#f4efe4", home: true },
  { id: "t5", x: 126, z: -8, w: 6, d: 7, h: 5.4, color: "#c5e1a5" },
];

export const PLAYGROUND = { x: 105, z: 12, w: 14, d: 10 };

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
