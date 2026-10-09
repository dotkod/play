import { makeChunkAABB } from "../../chunk-manager";
import { PASAR_BESAR } from "./meta";

export function pasarChunks() {
  return [makeChunkAABB(0, 0, PASAR_BESAR.id, 10), makeChunkAABB(0, 1, PASAR_BESAR.id, 12), makeChunkAABB(-1, 1, PASAR_BESAR.id, 10)];
}
