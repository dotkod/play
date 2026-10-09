import { makeChunkAABB, type ChunkAABB } from "../../chunk-manager";
import { MENARA_LEPAK } from "./meta";

export function menaraChunks(): ChunkAABB[] {
  const id = MENARA_LEPAK.id;
  const size = MENARA_LEPAK.chunkSize;
  const out: ChunkAABB[] = [];
  for (const ix of [-2, -1]) {
    for (const iz of [-1, 0]) {
      out.push(makeChunkAABB(ix, iz, id, ix === -2 ? 55 : 14, size));
    }
  }
  return out;
}
