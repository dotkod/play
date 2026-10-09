/** Lane graph: intersections + directed lanes. Shared by traffic, NPCs, buses, minimap. */

export const DEFAULT_CHUNK_SIZE = 64;

export type Vec2 = { x: number; z: number };

export type GraphNode = {
  id: string;
  x: number;
  z: number;
  /** If set, this node runs a traffic-light cycle (seconds). */
  signal?: boolean;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  /** Polyline in world XZ; first ≈ from, last ≈ to. */
  points: Vec2[];
  /** Carriageway half-width (m). */
  halfWidth: number;
  speed: number;
  /** Sidewalk / pedestrian edge (no vehicles). */
  sidewalk?: boolean;
  districtId: string;
};

export type RoadGraph = {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
};

export type Axis = "x" | "z";
type Signal = "green" | "yellow" | "red";

const CYCLE = 18;

/** Port of hub traffic light timing: axis green 7s, yellow 2s, then other axis. */
export function signalFor(axis: Axis, t: number): Signal {
  const p = t % CYCLE;
  const own = axis === "x" ? p : (p + CYCLE / 2) % CYCLE;
  return own < 7 ? "green" : own < 9 ? "yellow" : "red";
}

export function chunkIndex(coord: number, size = DEFAULT_CHUNK_SIZE): number {
  return Math.floor(coord / size);
}

export function chunkKey(x: number, z: number, size = DEFAULT_CHUNK_SIZE): string {
  return `${chunkIndex(x, size)},${chunkIndex(z, size)}`;
}

export function chunkOrigin(ix: number, iz: number, size = DEFAULT_CHUNK_SIZE): Vec2 {
  return { x: ix * size, z: iz * size };
}

export function mergeGraphs(...graphs: RoadGraph[]): RoadGraph {
  const nodes: Record<string, GraphNode> = {};
  const edges: Record<string, GraphEdge> = {};
  for (const g of graphs) {
    Object.assign(nodes, g.nodes);
    Object.assign(edges, g.edges);
  }
  return { nodes, edges };
}

function dist2(a: Vec2, b: Vec2) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/** Closest point on segment AB to P. */
function closestOnSeg(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; d2: number } {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const len2 = abx * abx + abz * abz;
  if (len2 < 1e-8) {
    const d2 = dist2(p, a);
    return { point: a, t: 0, d2 };
  }
  let t = ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + abx * t, z: a.z + abz * t };
  return { point, t, d2: dist2(p, point) };
}

export type NearestEdge = {
  edge: GraphEdge;
  point: Vec2;
  segIndex: number;
  d2: number;
};

export function nearestEdge(graph: RoadGraph, x: number, z: number, opts?: { sidewalk?: boolean }): NearestEdge | null {
  const p = { x, z };
  let best: NearestEdge | null = null;
  for (const edge of Object.values(graph.edges)) {
    if (opts?.sidewalk != null && !!edge.sidewalk !== opts.sidewalk) continue;
    const pts = edge.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const hit = closestOnSeg(p, pts[i], pts[i + 1]);
      if (!best || hit.d2 < best.d2) {
        best = { edge, point: hit.point, segIndex: i, d2: hit.d2 };
      }
    }
  }
  return best;
}

/** Approximate edge length along polyline. */
export function edgeLength(edge: GraphEdge): number {
  let len = 0;
  for (let i = 0; i < edge.points.length - 1; i++) {
    const a = edge.points[i];
    const b = edge.points[i + 1];
    len += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return len;
}

/** Point at distance `s` along edge (clamped). */
export function pointAlongEdge(edge: GraphEdge, s: number): { x: number; z: number; rotY: number } {
  const pts = edge.points;
  if (pts.length < 2) return { x: pts[0]?.x ?? 0, z: pts[0]?.z ?? 0, rotY: 0 };
  let remain = Math.max(0, s);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (remain <= seg || i === pts.length - 2) {
      const t = seg < 1e-8 ? 0 : Math.min(1, remain / seg);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        rotY: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    remain -= seg;
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  return { x: last.x, z: last.z, rotY: Math.atan2(last.x - prev.x, last.z - prev.z) };
}
