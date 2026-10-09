import { makeChunkAABB, type ChunkAABB } from "../../chunk-manager";
import { TLX } from "./meta";

export function tlxChunks(): ChunkAABB[] {
  const out: ChunkAABB[] = [];
  for (const ix of [0, 1]) {
    for (const iz of [-2, -1]) out.push(makeChunkAABB(ix, iz, TLX.id, iz === -2 ? 60 : 16, TLX.chunkSize));
  }
  return out;
}
