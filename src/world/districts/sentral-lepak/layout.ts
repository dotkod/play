import { makeChunkAABB } from "../../chunk-manager";
import { SENTRAL_LEPAK } from "./meta";

export function sentralChunks() {
  return [
    makeChunkAABB(-1, -1, SENTRAL_LEPAK.id, 16),
    makeChunkAABB(-1, 0, SENTRAL_LEPAK.id, 10),
    makeChunkAABB(0, -1, SENTRAL_LEPAK.id, 12),
  ];
}
