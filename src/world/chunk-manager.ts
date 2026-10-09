import { chunkIndex, chunkKey, DEFAULT_CHUNK_SIZE } from "./road-graph";

export type ChunkId = string; // "ix,iz"

export type ChunkAABB = {
  id: ChunkId;
  ix: number;
  iz: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Rough skyline height for impostor boxes. */
  h: number;
  districtId: string;
};

export function parseChunkId(id: ChunkId): { ix: number; iz: number } {
  const [a, b] = id.split(",");
  return { ix: Number(a), iz: Number(b) };
}

export function desiredChunks(px: number, pz: number, radius = 1, size = DEFAULT_CHUNK_SIZE): Set<ChunkId> {
  const cx = chunkIndex(px, size);
  const cz = chunkIndex(pz, size);
  const out = new Set<ChunkId>();
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      out.add(`${cx + dx},${cz + dz}`);
    }
  }
  return out;
}

/**
 * Tracks which chunks should be fully loaded vs shown as impostors.
 * Known catalogue comes from district layout registrations.
 */
export class ChunkManager {
  size: number;
  radius: number;
  known = new Map<ChunkId, ChunkAABB>();
  loaded = new Set<ChunkId>();
  impostors: ChunkAABB[] = [];

  constructor(opts?: { size?: number; radius?: number }) {
    this.size = opts?.size ?? DEFAULT_CHUNK_SIZE;
    this.radius = opts?.radius ?? 1;
  }

  register(chunks: ChunkAABB[]) {
    for (const c of chunks) this.known.set(c.id, c);
  }

  sync(px: number, pz: number) {
    const want = desiredChunks(px, pz, this.radius, this.size);
    this.loaded = want;
    this.impostors = [];
    for (const [id, aabb] of this.known) {
      if (!want.has(id)) this.impostors.push(aabb);
    }
    return want;
  }

  /** Ensure a world position's chunk is treated as loaded (bus arrival). */
  forceAround(px: number, pz: number) {
    return this.sync(px, pz);
  }
}

export function makeChunkAABB(
  ix: number,
  iz: number,
  districtId: string,
  h = 8,
  size = DEFAULT_CHUNK_SIZE,
): ChunkAABB {
  return {
    id: chunkKey(ix * size + 0.1, iz * size + 0.1, size),
    ix,
    iz,
    minX: ix * size,
    maxX: (ix + 1) * size,
    minZ: iz * size,
    maxZ: (iz + 1) * size,
    h,
    districtId,
  };
}
