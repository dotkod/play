import { makeChunkAABB } from "../../chunk-manager";
import { BUKIT_BINTIK } from "./meta";

export function bintikChunks() {
  return [makeChunkAABB(0, 0, BUKIT_BINTIK.id, 14), makeChunkAABB(1, 0, BUKIT_BINTIK.id, 14)];
}
