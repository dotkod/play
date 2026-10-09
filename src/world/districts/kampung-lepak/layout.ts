import { makeChunkAABB } from "../../chunk-manager";
import { KAMPUNG_LEPAK } from "./meta";

export function kampungChunks() {
  return [makeChunkAABB(-1, 0, KAMPUNG_LEPAK.id, 10), makeChunkAABB(-2, 0, KAMPUNG_LEPAK.id, 10), makeChunkAABB(-1, 1, KAMPUNG_LEPAK.id, 8)];
}
