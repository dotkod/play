/**
 * Simplified walkable spine for map painting + wayfinder pathfinding.
 * Axis-aligned corridors through Pusat and out to each district hub.
 * Prefer this over the vehicle lane graph (which has incomplete connectors).
 */

export type SpineNode = { id: string; x: number; z: number };
export type SpineEdge = { a: string; b: string };

export const SPINE_NODES: Record<string, SpineNode> = {
  pusat: { id: "pusat", x: 0, z: 0 },
  "x-pos": { id: "x-pos", x: 42, z: 0 },
  "x-neg": { id: "x-neg", x: -42, z: 0 },
  "z-pos": { id: "z-pos", x: 0, z: 42 },
  "z-neg": { id: "z-neg", x: 0, z: -42 },
  taman: { id: "taman", x: 110, z: 0 },
  menara: { id: "menara", x: -90, z: 0 },
  klcc: { id: "klcc", x: 0, z: -90 },
  pasar: { id: "pasar", x: 0, z: 58 },
  stadium: { id: "stadium", x: 12, z: 76 },
  bintik: { id: "bintik", x: 48, z: 22 },
  "bintik-j": { id: "bintik-j", x: 42, z: 0 },
  kampung: { id: "kampung", x: -62, z: 48 },
  "kampung-j": { id: "kampung-j", x: -42, z: 38 },
  petaling: { id: "petaling", x: 28, z: -28 },
  "petaling-j": { id: "petaling-j", x: 0, z: -28 },
  sentral: { id: "sentral", x: -40, z: -48 },
  "sentral-j": { id: "sentral-j", x: -20, z: -42 },
  tlx: { id: "tlx", x: 70, z: -75 },
  "tlx-j": { id: "tlx-j", x: 0, z: -75 },
};

/** Undirected corridors (centreline). */
export const SPINE_EDGES: SpineEdge[] = [
  { a: "x-neg", b: "pusat" },
  { a: "pusat", b: "x-pos" },
  { a: "z-neg", b: "pusat" },
  { a: "pusat", b: "z-pos" },
  { a: "x-pos", b: "taman" },
  { a: "x-neg", b: "menara" },
  { a: "z-neg", b: "klcc" },
  { a: "z-pos", b: "pasar" },
  { a: "pasar", b: "stadium" },
  { a: "x-pos", b: "bintik-j" },
  { a: "bintik-j", b: "bintik" },
  { a: "kampung-j", b: "kampung" },
  { a: "x-neg", b: "kampung-j" },
  { a: "petaling-j", b: "petaling" },
  { a: "z-neg", b: "petaling-j" },
  { a: "sentral-j", b: "sentral" },
  { a: "z-neg", b: "sentral-j" },
  { a: "tlx-j", b: "tlx" },
  { a: "klcc", b: "tlx-j" },
];

/** Road corridors for map/3D: { along axis, from, to, fixed other coord }. */
export type RoadStrip =
  | { axis: "x"; z: number; x0: number; x1: number }
  | { axis: "z"; x: number; z0: number; z1: number };

export const ROAD_STRIPS: RoadStrip[] = [
  { axis: "x", z: 0, x0: -105, x1: 140 },
  { axis: "z", x: 0, z0: -120, z1: 90 },
  { axis: "z", x: 48, z0: 0, z1: 28 },
  { axis: "x", z: 38, x0: -62, x1: -42 },
  { axis: "z", x: 28, z0: -42, z1: -18 },
  { axis: "x", z: -48, x0: -42, x1: -20 },
  { axis: "x", z: -75, x0: 0, x1: 72 },
  { axis: "x", z: 76, x0: 0, x1: 14 },
];

export type Vec2 = { x: number; z: number };

function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function closestOnSeg(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; d: number; t: number } {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const len2 = abx * abx + abz * abz;
  if (len2 < 1e-8) return { point: a, d: dist(p, a), t: 0 };
  let t = ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + abx * t, z: a.z + abz * t };
  return { point, d: dist(p, point), t };
}

/** Snap a world point onto the nearest spine edge. */
export function snapToSpine(x: number, z: number): Vec2 {
  const p = { x, z };
  let best = { point: p, d: Infinity };
  for (const e of SPINE_EDGES) {
    const a = SPINE_NODES[e.a];
    const b = SPINE_NODES[e.b];
    const hit = closestOnSeg(p, a, b);
    if (hit.d < best.d) best = hit;
  }
  return best.point;
}

type Adj = { to: string; cost: number };

function buildAdj(): Record<string, Adj[]> {
  const adj: Record<string, Adj[]> = {};
  for (const id of Object.keys(SPINE_NODES)) adj[id] = [];
  for (const e of SPINE_EDGES) {
    const a = SPINE_NODES[e.a];
    const b = SPINE_NODES[e.b];
    const cost = dist(a, b);
    adj[e.a].push({ to: e.b, cost });
    adj[e.b].push({ to: e.a, cost });
  }
  return adj;
}

const ADJ = buildAdj();

function nearestNode(x: number, z: number): string {
  let best = "pusat";
  let bestD = Infinity;
  for (const n of Object.values(SPINE_NODES)) {
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}

/**
 * Shortest path along the spine as a polyline (includes snapped start/end).
 * Falls back to straight line if something goes wrong.
 */
export function pathAlongRoads(fromX: number, fromZ: number, toX: number, toZ: number): Vec2[] {
  const start = snapToSpine(fromX, fromZ);
  const end = snapToSpine(toX, toZ);
  const startId = nearestNode(start.x, start.z);
  const endId = nearestNode(end.x, end.z);

  if (startId === endId) {
    return [{ x: fromX, z: fromZ }, start, end, { x: toX, z: toZ }];
  }

  // Dijkstra
  const distMap: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const open = new Set(Object.keys(SPINE_NODES));
  for (const id of open) {
    distMap[id] = Infinity;
    prev[id] = null;
  }
  distMap[startId] = 0;
  while (open.size) {
    let u: string | null = null;
    let best = Infinity;
    for (const id of open) {
      if (distMap[id] < best) {
        best = distMap[id];
        u = id;
      }
    }
    if (!u || best === Infinity) break;
    open.delete(u);
    if (u === endId) break;
    for (const { to, cost } of ADJ[u]) {
      const alt = distMap[u] + cost;
      if (alt < distMap[to]) {
        distMap[to] = alt;
        prev[to] = u;
      }
    }
  }

  const chain: string[] = [];
  let cur: string | null = endId;
  while (cur) {
    chain.push(cur);
    cur = prev[cur];
  }
  chain.reverse();
  if (chain[0] !== startId) {
    return [{ x: fromX, z: fromZ }, start, end, { x: toX, z: toZ }];
  }

  const pts: Vec2[] = [{ x: fromX, z: fromZ }, start];
  for (const id of chain) pts.push(SPINE_NODES[id]);
  pts.push(end, { x: toX, z: toZ });

  // Deduplicate consecutive near-identical points
  const out: Vec2[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.4) out.push(p);
  }
  return out;
}
