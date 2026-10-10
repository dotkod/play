/**
 * City grid: the one source every road, junction, sidewalk and block is derived from.
 *
 * Units are metres, y up. x runs east, z runs south (so "north" is -z). Malaysia drives on
 * the left. Everything else in `src/city` is computed from these numbers, which is what keeps
 * the city overlap-free: change a constant here and roads, sidewalks, lots, props, lanes and
 * colliders all move together.
 */

export const LANE_W = 3.5;
/** Two lanes plus a little shoulder each side. */
export const ROAD_HALF = 4;
/** Sidewalk from kerb to building line. */
export const WALK_W = 4.5;
/** Buildable square inside each block. */
export const BLOCK = 33;
export const PITCH = BLOCK + 2 * (ROAD_HALF + WALK_W);
/** Grass margin around the outer sidewalk before the world edge. */
export const MARGIN = 14;

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Axis = "x" | "z";

export type GridNode = {
  id: string;
  i: number;
  j: number;
  x: number;
  z: number;
  /** Arms present: n/s/e/w */
  arms: { n: boolean; s: boolean; e: boolean; w: boolean };
  kind: "cross" | "tee" | "corner";
  /** Inner 4-way junctions get signals, zebras and stop lines. */
  signal: boolean;
};

export type RoadSegment = {
  id: string;
  axis: Axis;
  a: GridNode;
  b: GridNode;
  /** Asphalt between the two junction boxes. */
  rect: Rect;
};

export type Block = {
  id: string;
  bx: number;
  bz: number;
  /** Buildable area (inside the sidewalks). */
  lot: Rect;
  /** Lot grown by the sidewalk: lot + sidewalk ring. */
  outer: Rect;
};

export type Grid = {
  blocksX: number;
  blocksZ: number;
  xs: number[];
  zs: number[];
  nodes: GridNode[];
  segments: RoadSegment[];
  blocks: Block[];
  /** Square asphalt box at each node. */
  junctions: { node: GridNode; rect: Rect }[];
  /** Sidewalk slabs (non-overlapping rectangles). */
  sidewalks: Rect[];
  /** Everything the city occupies, plus grass margin. */
  bounds: Rect;
};

export const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });
export const grow = (r: Rect, d: number): Rect => rect(r.minX - d, r.maxX + d, r.minZ - d, r.maxZ + d);
export const rectW = (r: Rect) => r.maxX - r.minX;
export const rectD = (r: Rect) => r.maxZ - r.minZ;
export const centre = (r: Rect) => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 });

/** Overlap depth (positive on both axes = overlapping). */
export function overlap(a: Rect, b: Rect) {
  return Math.min(Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX), Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
}

export function inRect(x: number, z: number, r: Rect, pad = 0) {
  return x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad;
}

function lines(n: number) {
  return Array.from({ length: n + 1 }, (_, i) => (i - n / 2) * PITCH);
}

export function makeGrid(blocksX: number, blocksZ: number): Grid {
  const xs = lines(blocksX);
  const zs = lines(blocksZ);
  const lastI = xs.length - 1;
  const lastJ = zs.length - 1;

  const nodes: GridNode[] = [];
  for (let j = 0; j <= lastJ; j++) {
    for (let i = 0; i <= lastI; i++) {
      const arms = { n: j > 0, s: j < lastJ, e: i < lastI, w: i > 0 };
      const count = Number(arms.n) + Number(arms.s) + Number(arms.e) + Number(arms.w);
      const kind = count === 4 ? "cross" : count === 3 ? "tee" : "corner";
      nodes.push({ id: `n${i}-${j}`, i, j, x: xs[i], z: zs[j], arms, kind, signal: kind === "cross" });
    }
  }
  const node = (i: number, j: number) => nodes[j * (lastI + 1) + i];

  const segments: RoadSegment[] = [];
  for (let j = 0; j <= lastJ; j++) {
    for (let i = 0; i < lastI; i++) {
      const a = node(i, j);
      const b = node(i + 1, j);
      segments.push({ id: `x${i}-${j}`, axis: "x", a, b, rect: rect(a.x + ROAD_HALF, b.x - ROAD_HALF, a.z - ROAD_HALF, a.z + ROAD_HALF) });
    }
  }
  for (let i = 0; i <= lastI; i++) {
    for (let j = 0; j < lastJ; j++) {
      const a = node(i, j);
      const b = node(i, j + 1);
      segments.push({ id: `z${i}-${j}`, axis: "z", a, b, rect: rect(a.x - ROAD_HALF, a.x + ROAD_HALF, a.z + ROAD_HALF, b.z - ROAD_HALF) });
    }
  }

  const blocks: Block[] = [];
  for (let bz = 0; bz < blocksZ; bz++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const outer = rect(xs[bx] + ROAD_HALF, xs[bx + 1] - ROAD_HALF, zs[bz] + ROAD_HALF, zs[bz + 1] - ROAD_HALF);
      blocks.push({ id: `b${bx}-${bz}`, bx, bz, outer, lot: grow(outer, -WALK_W) });
    }
  }

  // Sidewalk ring per block: full-width north/south strips, side strips between them
  const sidewalks: Rect[] = [];
  const ring = (o: Rect, w: number) => {
    sidewalks.push(rect(o.minX, o.maxX, o.minZ, o.minZ + w));
    sidewalks.push(rect(o.minX, o.maxX, o.maxZ - w, o.maxZ));
    sidewalks.push(rect(o.minX, o.minX + w, o.minZ + w, o.maxZ - w));
    sidewalks.push(rect(o.maxX - w, o.maxX, o.minZ + w, o.maxZ - w));
  };
  for (const b of blocks) ring(b.outer, WALK_W);
  // Outer sidewalk around the ring road (city edge)
  const edge = rect(xs[0] - ROAD_HALF, xs[lastI] + ROAD_HALF, zs[0] - ROAD_HALF, zs[lastJ] + ROAD_HALF);
  const out = grow(edge, WALK_W);
  sidewalks.push(rect(out.minX, out.maxX, out.minZ, edge.minZ));
  sidewalks.push(rect(out.minX, out.maxX, edge.maxZ, out.maxZ));
  sidewalks.push(rect(out.minX, edge.minX, edge.minZ, edge.maxZ));
  sidewalks.push(rect(edge.maxX, out.maxX, edge.minZ, edge.maxZ));

  return {
    blocksX,
    blocksZ,
    xs,
    zs,
    nodes,
    segments,
    blocks,
    junctions: nodes.map((n) => ({ node: n, rect: rect(n.x - ROAD_HALF, n.x + ROAD_HALF, n.z - ROAD_HALF, n.z + ROAD_HALF) })),
    sidewalks,
    bounds: grow(out, MARGIN),
  };
}

/** Asphalt rectangles: segments + junction boxes. */
export function asphalt(g: Grid): Rect[] {
  return [...g.segments.map((s) => s.rect), ...g.junctions.map((j) => j.rect)];
}
