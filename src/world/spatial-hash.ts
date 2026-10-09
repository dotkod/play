import type { Circle } from "./colliders";

const CELL = 4;

function key(cx: number, cz: number) {
  return `${cx},${cz}`;
}

/** Grid for nearby collider queries. Rebuild static once; dynamic cleared per frame. */
export class SpatialHash {
  private cells = new Map<string, Circle[]>();

  clear() {
    this.cells.clear();
  }

  insert(c: Circle) {
    const minX = Math.floor((c.x - c.r) / CELL);
    const maxX = Math.floor((c.x + c.r) / CELL);
    const minZ = Math.floor((c.z - c.r) / CELL);
    const maxZ = Math.floor((c.z + c.r) / CELL);
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const k = key(ix, iz);
        let bucket = this.cells.get(k);
        if (!bucket) {
          bucket = [];
          this.cells.set(k, bucket);
        }
        bucket.push(c);
      }
    }
  }

  insertAll(list: Circle[]) {
    for (const c of list) this.insert(c);
  }

  query(x: number, z: number, r: number): Circle[] {
    const minX = Math.floor((x - r) / CELL);
    const maxX = Math.floor((x + r) / CELL);
    const minZ = Math.floor((z - r) / CELL);
    const maxZ = Math.floor((z + r) / CELL);
    const out: Circle[] = [];
    const seen = new Set<Circle>();
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const bucket = this.cells.get(key(ix, iz));
        if (!bucket) continue;
        for (const c of bucket) {
          if (seen.has(c)) continue;
          seen.add(c);
          out.push(c);
        }
      }
    }
    return out;
  }
}

export const staticHash = new SpatialHash();
export const dynamicHash = new SpatialHash();
