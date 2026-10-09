import { makeChunkAABB } from "../../chunk-manager";
import { BUKIT_JALAN } from "./meta";

export function jalanChunks() {
  return [
    makeChunkAABB(0, 0, BUKIT_JALAN.id, 12),
    makeChunkAABB(0, 1, BUKIT_JALAN.id, 18),
    makeChunkAABB(-1, 1, BUKIT_JALAN.id, 14),
  ];
}
