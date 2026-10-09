/**
 * Walkable / driveable spine: axis-aligned corridors through Pusat and out to each district.
 * ROAD_STRIPS is derived from edges so map, traffic, and 3D asphalt stay in sync.
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
  "stadium-j": { id: "stadium-j", x: 0, z: 76 },
  // Bukit Bintik — L off east arterial
  "bintik-j": { id: "bintik-j", x: 48, z: 0 },
  bintik: { id: "bintik", x: 48, z: 22 },
  // Kampung — L off west arterial into the village centre
  "kampung-j": { id: "kampung-j", x: -42, z: 38 },
  "kampung-k": { id: "kampung-k", x: -62, z: 38 },
  kampung: { id: "kampung", x: -65, z: 50 },
  // Petaling Lane — spur east of north arterial
  "petaling-j": { id: "petaling-j", x: 0, z: -28 },
  petaling: { id: "petaling", x: 28, z: -28 },
  // Sentral — L northwest
  "sentral-j": { id: "sentral-j", x: 0, z: -48 },
  "sentral-k": { id: "sentral-k", x: -40, z: -48 },
  sentral: { id: "sentral", x: -40, z: -52 },
  // TLX — east spur at bus-stop latitude (park sits north of the road)
  "tlx-j": { id: "tlx-j", x: 0, z: -68 },
  tlx: { id: "tlx", x: 78, z: -68 },
};

/** Undirected corridors (centreline). All edges are axis-aligned. */
export const SPINE_EDGES: SpineEdge[] = [
  { a: "x-neg", b: "pusat" },
  { a: "pusat", b: "x-pos" },
  { a: "z-neg", b: "pusat" },
  { a: "pusat", b: "z-pos" },
  { a: "x-pos", b: "taman" },
  { a: "x-neg", b: "menara" },
  { a: "z-neg", b: "tlx-j" },
  { a: "tlx-j", b: "klcc" },
  { a: "z-pos", b: "pasar" },
  { a: "pasar", b: "stadium-j" },
  { a: "stadium-j", b: "stadium" },
  { a: "x-pos", b: "bintik-j" },
  { a: "bintik-j", b: "bintik" },
  { a: "x-neg", b: "kampung-j" },
  { a: "kampung-j", b: "kampung-k" },
  { a: "kampung-k", b: "kampung" },
  { a: "z-neg", b: "petaling-j" },
  { a: "petaling-j", b: "petaling" },
  { a: "z-neg", b: "sentral-j" },
  { a: "sentral-j", b: "sentral-k" },
  { a: "sentral-k", b: "sentral" },
  { a: "tlx-j", b: "tlx" },
];

/** Road / walk-path corridor: along axis, from–to, fixed other coord. */
export type RoadStrip =
  | { axis: "x"; z: number; x0: number; x1: number }
  | { axis: "z"; x: number; z0: number; z1: number };

function edgeToStrip(a: SpineNode, b: SpineNode): RoadStrip | null {
  if (Math.abs(a.z - b.z) < 0.05) {
    return { axis: "x", z: (a.z + b.z) / 2, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x) };
  }
  if (Math.abs(a.x - b.x) < 0.05) {
    return { axis: "z", x: (a.x + b.x) / 2, z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) };
  }
  return null;
}

/** Merge colinear overlapping/touching strips into continuous corridors. */
function mergeStrips(raw: RoadStrip[]): RoadStrip[] {
  const xs = new Map<string, { z: number; segs: [number, number][] }>();
  const zs = new Map<string, { x: number; segs: [number, number][] }>();
  for (const s of raw) {
    if (s.axis === "x") {
      const key = s.z.toFixed(2);
      const g = xs.get(key) ?? { z: s.z, segs: [] };
      g.segs.push([Math.min(s.x0, s.x1), Math.max(s.x0, s.x1)]);
      xs.set(key, g);
    } else {
      const key = s.x.toFixed(2);
      const g = zs.get(key) ?? { x: s.x, segs: [] };
      g.segs.push([Math.min(s.z0, s.z1), Math.max(s.z0, s.z1)]);
      zs.set(key, g);
    }
  }
  const merge = (segs: [number, number][]) => {
    segs.sort((a, b) => a[0] - b[0]);
    const out: [number, number][] = [];
    for (const s of segs) {
      const last = out[out.length - 1];
      if (!last || s[0] > last[1] + 0.5) out.push([...s]);
      else last[1] = Math.max(last[1], s[1]);
    }
    return out;
  };
  const result: RoadStrip[] = [];
  for (const g of xs.values()) {
    for (const [x0, x1] of merge(g.segs)) result.push({ axis: "x", z: g.z, x0, x1 });
  }
  for (const g of zs.values()) {
    for (const [z0, z1] of merge(g.segs)) result.push({ axis: "z", x: g.x, z0, z1 });
  }
  return result;
}

function buildRoadStrips(): RoadStrip[] {
  const raw: RoadStrip[] = [];
  for (const e of SPINE_EDGES) {
    const strip = edgeToStrip(SPINE_NODES[e.a], SPINE_NODES[e.b]);
    if (strip) raw.push(strip);
  }
  return mergeStrips(raw);
}

export const ROAD_STRIPS: RoadStrip[] = buildRoadStrips();

/**
 * Narrow pedestrian alleys (not for cars). Painted on map + 3D; wayfinder can snap nearby.
 * Half-width ~1.1m — five-foot-way / laneway feel.
 */
export const WALK_PATH_HALF = 1.15;
export const WALK_PATHS: RoadStrip[] = [
  // Pusat — shop frontage to carriageway edge (north row)
  { axis: "z", x: 15, z0: -6.2, z1: -3.2 }, // Anne Maju
  { axis: "z", x: 26, z0: -6.2, z1: -3.2 }, // kedai emas area
  { axis: "z", x: 5, z0: -6.2, z1: -3.2 }, // warung / kopitiam stretch
  // South row
  { axis: "z", x: -19, z0: 3.2, z1: 6.2 }, // LRT plaza
  { axis: "z", x: -8, z0: 3.2, z1: 6.2 }, // gunting / bank
  { axis: "z", x: 8, z0: 3.2, z1: 6.2 }, // farmasi stretch
  // Side laneways between shophouse blocks (parallel to cross road)
  { axis: "x", z: -9.5, x0: 10, x1: 20 }, // behind Anne block
  { axis: "x", z: 9.5, x0: -24, x1: -12 }, // behind LRT block
  // Bus stop spur
  { axis: "z", x: -31, z0: 4, z1: 12 },
  // Nasi lemak stall approach
  { axis: "x", z: 8, x0: -6, x1: 2 },
  // Masjid / river walk
  { axis: "z", x: -28, z0: 14, z1: 28 },
  // KLCC park cross paths (pedestrian)
  { axis: "z", x: 0, z0: -102, z1: -88 },
  { axis: "x", z: -92, x0: -10, x1: 10 },
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

  const out: Vec2[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.4) out.push(p);
  }
  return out;
}
