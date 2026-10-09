import { makeChunkAABB, type ChunkAABB } from "../../chunk-manager";
import { KLCC } from "./meta";

export function klccChunks(): ChunkAABB[] {
  const id = KLCC.id;
  const size = KLCC.chunkSize;
  // iz -2 = z -128..-64, iz -1 = -64..0
  const out: ChunkAABB[] = [];
  for (const ix of [-1, 0, 1]) {
    for (const iz of [-2, -1]) {
      out.push(makeChunkAABB(ix, iz, id, iz === -2 ? 48 : 12, size));
    }
  }
  return out;
}
