import { makeChunkAABB } from "../../chunk-manager";
import { PETALING_LANE } from "./meta";

export function petalingChunks() {
  return [makeChunkAABB(0, -1, PETALING_LANE.id, 10), makeChunkAABB(0, 0, PETALING_LANE.id, 8)];
}
