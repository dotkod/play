import { hashString } from "@/shared/rng";
import { PLAYGROUND } from "@/world/districts/taman-ceria/layout";
import { ROAD_STRIPS, WALK_PATHS, WALK_PATH_HALF } from "@/world/walk-spine";
import { BUILDINGS, footprint, WALK_HALF } from "./world-data";

export type MapTree = { x: number; z: number; r: number };
export type MapBlock = { x: number; z: number; w: number; d: number; color: string };

/** Deterministic pseudo-random in [0,1) from world grid. */
function cellRand(ix: number, iz: number) {
  const h = hashString(`map-tree:${ix},${iz}`);
  return (h % 10000) / 10000;
}

function nearStrip(x: number, z: number, pad: number) {
  for (const s of ROAD_STRIPS) {
    if (s.axis === "x") {
      if (Math.abs(z - s.z) <= WALK_HALF + pad && x >= s.x0 - pad && x <= s.x1 + pad) return true;
    } else if (Math.abs(x - s.x) <= WALK_HALF + pad && z >= s.z0 - pad && z <= s.z1 + pad) return true;
  }
  for (const s of WALK_PATHS) {
    if (s.axis === "x") {
      if (Math.abs(z - s.z) <= WALK_PATH_HALF + pad && x >= s.x0 - pad && x <= s.x1 + pad) return true;
    } else if (Math.abs(x - s.x) <= WALK_PATH_HALF + pad && z >= s.z0 - pad && z <= s.z1 + pad) return true;
  }
  return false;
}

function nearRoad(x: number, z: number) {
  // Keep canopy clear of carriageway + verge (trees in the road looked broken)
  return nearStrip(x, z, 3.2);
}

function inBuilding(x: number, z: number) {
  for (const b of BUILDINGS) {
    const f = footprint(b);
    if (x > f.minX - 3 && x < f.maxX + 3 && z > f.minZ - 3 && z < f.maxZ + 3) return true;
  }
  const pg = PLAYGROUND;
  if (x > pg.x - pg.w / 2 - 2 && x < pg.x + pg.w / 2 + 2 && z > pg.z - pg.d / 2 - 2 && z < pg.z + pg.d / 2 + 2) {
    return true;
  }
  // Soft landmark footprints (map-only props that look wrong with trees through them)
  if (Math.hypot(x + 28, z - 22) < 12) return true; // Masjid Lepak
  if (x > -40 && x < -24 && z > 4 && z < 60) return true; // Sungai Lepak
  if (Math.hypot(x - 12, z - 76) < 14) return true; // stadium bowl
  return false;
}

/** Mid-rise / tower footprints along arterials — fill empty map green. */
export const MAP_BLOCKS: MapBlock[] = [
  // East toward Taman
  { x: 58, z: -9, w: 10, d: 8, color: "#c5ced8" },
  { x: 72, z: 9, w: 8, d: 12, color: "#b8c4d0" },
  { x: 88, z: -8, w: 12, d: 7, color: "#d0d8e0" },
  { x: 98, z: 10, w: 7, d: 9, color: "#aeb8c4" },
  // West toward Menara
  { x: -58, z: 9, w: 9, d: 8, color: "#c8d0da" },
  { x: -72, z: -9, w: 11, d: 7, color: "#b4bec8" },
  { x: -82, z: 8, w: 8, d: 11, color: "#d4dde6" },
  // North toward KLCC
  { x: -10, z: -58, w: 8, d: 10, color: "#c5ced8" },
  { x: 11, z: -62, w: 7, d: 9, color: "#a8b4c0" },
  { x: -9, z: -78, w: 9, d: 8, color: "#d0d8e0" },
  { x: 12, z: -82, w: 8, d: 12, color: "#b8c4d0" },
  // South toward Pasar / stadium
  { x: -10, z: 50, w: 8, d: 7, color: "#c4b8a0" },
  { x: 11, z: 52, w: 7, d: 8, color: "#d0c4a8" },
  { x: 22, z: 68, w: 9, d: 8, color: "#b8b0a0" },
  // Petaling / Sentral / Bintik / Kampung pockets
  { x: 22, z: -36, w: 6, d: 8, color: "#e8a87c" },
  { x: -28, z: -56, w: 10, d: 8, color: "#c5ced8" },
  { x: 56, z: 14, w: 7, d: 6, color: "#3a3f46" },
  { x: -52, z: 44, w: 8, d: 6, color: "#8fbc6e" },
  // TLX corridor (north of the bus-stop arterial at z=-68)
  { x: 28, z: -78, w: 8, d: 9, color: "#a8c4d8" },
  { x: 48, z: -78, w: 10, d: 7, color: "#9eb4c8" },
];

/** Shared tree positions for 2D map + optional 3D scatter. Never on roads / footprints. */
export const MAP_TREES: MapTree[] = (() => {
  const out: MapTree[] = [];
  const step = 10;
  for (let x = -108; x <= 142; x += step) {
    for (let z = -124; z <= 88; z += step) {
      const jx = (cellRand(x, z) - 0.5) * 2.2;
      const jz = (cellRand(z, x) - 0.5) * 2.2;
      const wx = x + jx;
      const wz = z + jz;
      if (nearRoad(wx, wz) || inBuilding(wx, wz)) continue;
      if (MAP_BLOCKS.some((bl) => Math.abs(wx - bl.x) < bl.w / 2 + 3.5 && Math.abs(wz - bl.z) < bl.d / 2 + 3.5)) {
        continue;
      }
      // Keep parks open — only ~28% of far cells get a tree
      if (cellRand(wx * 3, wz * 7) < 0.72) continue;
      out.push({ x: wx, z: wz, r: 0.35 + cellRand(wx, wz) * 0.45 });
    }
  }
  return out;
})();

export function paintMapTrees(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  k: number,
  dpr: number,
) {
  for (const t of MAP_TREES) {
    const px = X(t.x);
    const pz = Z(t.z);
    const trunk = Math.max(1.2, t.r * k * 0.35);
    const crown = Math.max(2.5, t.r * k * 1.1);
    b.fillStyle = "#6b4423";
    b.beginPath();
    b.arc(px, pz, trunk, 0, Math.PI * 2);
    b.fill();
    b.fillStyle = cellRand(t.x, t.z) > 0.5 ? "#3d9a52" : "#2f8f4e";
    b.beginPath();
    b.arc(px, pz - crown * 0.35, crown, 0, Math.PI * 2);
    b.fill();
  }
  // Extra palms near “river”
  for (const [x, z] of [
    [-34, 18],
    [-36, 28],
    [-30, 38],
    [-33, 48],
  ]) {
    b.fillStyle = "#8b6914";
    b.fillRect(X(x) - dpr, Z(z) - 3 * dpr, 2 * dpr, 5 * dpr);
    b.fillStyle = "#2d8a4a";
    b.beginPath();
    b.ellipse(X(x), Z(z) - 4 * dpr, 4 * dpr, 3 * dpr, 0, 0, Math.PI * 2);
    b.fill();
  }
}

export function paintMapLandmarks(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  k: number,
  dpr: number,
) {
  // Sungai Lepak (west)
  b.fillStyle = "#6ec4e8";
  b.fillRect(X(-38), Z(6), 14 * k, 52 * k);
  b.fillStyle = "#4aa8cc";
  b.globalAlpha = 0.35;
  b.fillRect(X(-38), Z(6), 14 * k, 52 * k);
  b.globalAlpha = 1;

  // Masjid Lepak stub
  b.fillStyle = "#e8eef4";
  b.beginPath();
  b.arc(X(-28), Z(22), 8 * dpr, 0, Math.PI * 2);
  b.fill();
  b.fillStyle = "#1f8a4c";
  b.beginPath();
  b.arc(X(-28), Z(18), 5 * dpr, Math.PI, 0);
  b.fill();
  b.strokeStyle = "#1f1a17";
  b.lineWidth = 1 * dpr;
  b.stroke();

  // Taman playground
  const pg = PLAYGROUND;
  b.fillStyle = "#7cbc6e";
  b.fillRect(X(pg.x - pg.w / 2), Z(pg.z - pg.d / 2), pg.w * k, pg.d * k);
  b.font = `${Math.round(11 * dpr)}px system-ui, sans-serif`;
  b.textAlign = "center";
  b.fillText("🛝", X(pg.x), Z(pg.z));

  // Mid-rise fill blocks (towers / offices along arterials)
  for (const bl of MAP_BLOCKS) {
    b.fillStyle = bl.color;
    b.strokeStyle = "#1f1a17";
    b.lineWidth = 1 * dpr;
    b.fillRect(X(bl.x - bl.w / 2), Z(bl.z - bl.d / 2), bl.w * k, bl.d * k);
    b.strokeRect(X(bl.x - bl.w / 2), Z(bl.z - bl.d / 2), bl.w * k, bl.d * k);
  }
}

/** District labels — call last so markers don't cover the text. */
export function paintMapLabels(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  dpr: number,
) {
  const label = (text: string, x: number, z: number) => {
    b.font = `bold ${Math.round(9 * dpr)}px system-ui, sans-serif`;
    b.textAlign = "center";
    b.textBaseline = "middle";
    const tw = b.measureText(text).width + 8 * dpr;
    b.fillStyle = "rgba(31,26,23,0.78)";
    b.fillRect(X(x) - tw / 2, Z(z) - 6 * dpr, tw, 12 * dpr);
    b.fillStyle = "#fbf3e4";
    b.fillText(text, X(x), Z(z));
  };
  label("Pusat Lepak", 0, 18);
  label("Taman Ceria", 110, 12);
  label("KLCC", 0, -100);
  label("Menara Lepak", -90, 12);
  label("TLX", 70, -74);
  label("Bukit Bintik", 50, 26);
  label("Bukit Jalan", 12, 82);
  label("Kampung", -65, 54);
  label("Pasar Besar", 0, 62);
  label("Petaling", 30, -30);
  label("Sentral", -40, -54);
}

/** Soft grass variation so empty tiles aren't flat. */
export function paintMapGrass(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  k: number,
) {
  for (let x = -108; x <= 140; x += 12) {
    for (let z = -120; z <= 88; z += 12) {
      if (cellRand(x + 99, z) < 0.55) continue;
      const shade = cellRand(x, z) > 0.5 ? "#7ec872" : "#92d086";
      b.fillStyle = shade;
      b.globalAlpha = 0.22;
      b.fillRect(X(x), Z(z), 10 * k, 10 * k);
      b.globalAlpha = 1;
    }
  }
}
