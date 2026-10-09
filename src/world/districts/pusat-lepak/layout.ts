// Layout of Pusat Lepak. Units are metres; y is up, the main road runs along x, the cross road along z.
// Malaysia drives on the left, so lanes are placed on the left of each direction of travel.

import { makeChunkAABB, type ChunkAABB } from "../../chunk-manager";
import { PUSAT_LEPAK } from "./meta";

export const ROAD_HALF = 3;
export const WALK_HALF = 6;
export const FRONT = 6.6;
export const EXTENT = 42;
/** Legacy single-district clamp; player uses WORLD_* from `@/world/bounds`. */
export const BOUNDS = 38;
export const WORLD_MIN_X = -110;
export const WORLD_MAX_X = 145;
export const WORLD_MIN_Z = -128;
export const WORLD_MAX_Z = 95;
export const SIDEWALK_MID = (ROAD_HALF + WALK_HALF) / 2;
/**
 * Keep north/south shophouse X-ranges clear of the cross-road traffic lanes (±LANE≈1.5)
 * plus half a wide vehicle (~1.25). Buildings that overlap [-ROAD_CLEAR, ROAD_CLEAR]
 * will eat Z-axis cars when they drive past.
 */
export const ROAD_CLEAR = ROAD_HALF + 1.3;
/** Minimum gap between neighbouring shophouses on the same side. */
export const BUILDING_GAP = 0.5;

export type BuildingKind = "mamak" | "shophouse" | "lrt" | "mall";

export type Building = {
  id: string;
  kind: BuildingKind;
  sign: string;
  x: number;
  side: "north" | "south";
  w: number;
  d: number;
  h: number;
  color: string;
  game?: { slug: string; title: string; emoji: string };
  soon?: { title: string; emoji: string };
  /** Walk-in interior (overlay for now). */
  interior?: { title: string; emoji: string; blurbMs: string; blurbEn: string };
  /** Live LRT station door (Phase 4a). */
  lrt?: boolean;
};

/**
 * Original 10 stay put. Phase 3 fills only free slots:
 * - north: west of cross (past parking) + east of cross (before Anne)
 * - south: east of cross (before Bank) + far east (past Dobi)
 * Never invade ±ROAD_CLEAR (Z-traffic) or overlap neighbours.
 */
export const BUILDINGS: Building[] = [
  { id: "anne-maju", kind: "mamak", sign: "RESTORAN ANNE MAJU", x: 15, side: "north", w: 10, d: 8, h: 5, color: "#f4efe4", game: { slug: "anne-maju", title: "Anne Maju", emoji: "🍵" } },
  {
    id: "runcit",
    kind: "shophouse",
    sign: "KEDAI RUNCIT AH SENG",
    x: 26.5,
    side: "north",
    w: 8,
    d: 8,
    h: 6.5,
    color: "#f2c46b",
    interior: { title: "Kedai Runcit Ah Seng", emoji: "🛒", blurbMs: "Rak penuh barang runcit. Ah Seng tengah kira duit.", blurbEn: "Shelves packed with groceries. Ah Seng is counting change." },
  },
  {
    id: "klinik",
    kind: "shophouse",
    sign: "KLINIK 24 JAM",
    x: 35,
    side: "north",
    w: 7,
    d: 8,
    h: 6,
    color: "#bfe1f2",
    interior: { title: "Klinik 24 Jam", emoji: "🏥", blurbMs: "Bau antiseptik. Nombor giliran 47… kau nombor 48.", blurbEn: "Smells like antiseptic. Queue number 47… you're 48." },
  },
  {
    id: "parking",
    kind: "mall",
    sign: "MEGA MALL",
    x: -20,
    side: "north",
    w: 18,
    d: 12,
    h: 9,
    color: "#d9d4f0",
    interior: { title: "Mega Mall", emoji: "🏬", blurbMs: "AC kuat gila. Escator naik, muzik mall berulang.", blurbEn: "Freezing AC. Escalators up, mall muzak on loop." },
  },
  {
    id: "kopitiam",
    kind: "shophouse",
    sign: "KOPITIAM",
    x: -34,
    side: "north",
    w: 7,
    d: 8,
    h: 6,
    color: "#f5b7a3",
    interior: { title: "Kopitiam", emoji: "☕", blurbMs: "Meja marble, telur setengah masak, kopi kau dingin sikit.", blurbEn: "Marble tables, half-boiled eggs, your kopi's going cold." },
  },
  { id: "lrt", kind: "lrt", sign: "STESEN LRT", x: -19, side: "south", w: 16, d: 9, h: 4.6, color: "#e6e9ec", lrt: true },
  {
    id: "gunting",
    kind: "shophouse",
    sign: "KEDAI GUNTING",
    x: -34,
    side: "south",
    w: 7,
    d: 8,
    h: 6,
    color: "#a8d8b0",
    interior: { title: "Kedai Gunting", emoji: "✂️", blurbMs: "Cermin besar, radio softly. 'Potong pendek?'", blurbEn: "Big mirrors, soft radio. 'Short trim?'" },
  },
  {
    id: "bank",
    kind: "shophouse",
    sign: "BANK",
    x: 14,
    side: "south",
    w: 9,
    d: 8,
    h: 7,
    color: "#e3e1dc",
    interior: { title: "Bank", emoji: "🏦", blurbMs: "Queue panjang. Ting-ting. Ambil nombor dulu.", blurbEn: "Long queue. Ding. Take a number first." },
  },
  {
    id: "kedai-kain",
    kind: "shophouse",
    sign: "KEDAI KAIN",
    x: 24,
    side: "south",
    w: 8,
    d: 8,
    h: 6.5,
    color: "#f3b6c9",
    interior: { title: "Kedai Kain", emoji: "🧵", blurbMs: "Kain bergulung sampai siling. 'Ini batik original eh.'", blurbEn: "Bolts of cloth to the ceiling. 'This batik is original.'" },
  },
  {
    id: "dobi",
    kind: "shophouse",
    sign: "DOBI",
    x: 33,
    side: "south",
    w: 7,
    d: 8,
    h: 6,
    color: "#c7b2e6",
    interior: { title: "Dobi", emoji: "👕", blurbMs: "Bau detergen, mesin berputar. Tiket kau kat kaunter.", blurbEn: "Detergent smell, machines spinning. Your ticket's at the counter." },
  },
  // Phase 3 — slotted into gaps only
  {
    id: "warung",
    kind: "shophouse",
    sign: "WARUNG MAK",
    x: -7.5,
    side: "north",
    w: 5,
    d: 7,
    h: 5,
    color: "#e8a87c",
    interior: { title: "Warung Mak", emoji: "🍛", blurbMs: "Nasi panas, lauk empat jenis. Mak senyum dari belakang.", blurbEn: "Hot rice, four sides. Mak smiles from the back." },
  },
  {
    id: "kedai-emas",
    kind: "shophouse",
    sign: "KEDAI EMAS",
    x: 6.75,
    side: "north",
    w: 4.5,
    d: 8,
    h: 6.5,
    color: "#f5e6a3",
    interior: { title: "Kedai Emas", emoji: "💍", blurbMs: "Gelang berkilat dalam vitrin. Guard tengok kau.", blurbEn: "Bangles glitter in the case. The guard eyes you." },
  },
  {
    id: "farmasi",
    kind: "shophouse",
    sign: "FARMASI",
    x: 6.75,
    side: "south",
    w: 4.5,
    d: 8,
    h: 6,
    color: "#9fd4c8",
    interior: { title: "Farmasi", emoji: "💊", blurbMs: "Vitamin, plaster, ubat batuk. 'Ada resipi?'", blurbEn: "Vitamins, plasters, cough syrup. 'Got a prescription?'" },
  },
  {
    id: "surau-pusat",
    kind: "shophouse",
    sign: "SURAU",
    x: 41,
    side: "south",
    w: 7,
    d: 9,
    h: 5.5,
    color: "#dfece6",
    interior: { title: "Surau", emoji: "🕌", blurbMs: "Senyap, sejuk, bau tikar. Ambil wuduk dulu.", blurbEn: "Quiet, cool, mat smell. Take wudu first." },
  },
];

/** True if a north/south building's X span invades the cross-road car corridor. */
export function buildingBlocksCrossRoad(b: Building) {
  const minX = b.x - b.w / 2;
  const maxX = b.x + b.w / 2;
  return !(maxX < -ROAD_CLEAR || minX > ROAD_CLEAR);
}

export function footprint(b: Building) {
  const dir = b.side === "north" ? -1 : 1;
  const front = dir * FRONT;
  const cz = front + (dir * b.d) / 2;
  return { cx: b.x, cz, front, facing: -dir, minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: Math.min(front, front + dir * b.d), maxZ: Math.max(front, front + dir * b.d) };
}

/** Dev assert: no pairwise overlap, no road invasion. */
export function assertBuildingLayout(list: Building[] = BUILDINGS) {
  const errors: string[] = [];
  for (const b of list) {
    if (buildingBlocksCrossRoad(b)) errors.push(`${b.id} invades ±ROAD_CLEAR`);
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.side !== b.side) continue;
      const fa = footprint(a);
      const fb = footprint(b);
      const ox = Math.min(fa.maxX, fb.maxX) - Math.max(fa.minX, fb.minX);
      const oz = Math.min(fa.maxZ, fb.maxZ) - Math.max(fa.minZ, fb.minZ);
      if (ox > 0 && oz > 0) errors.push(`${a.id} overlaps ${b.id} by ${ox.toFixed(2)}m`);
      else if (ox > -BUILDING_GAP && ox <= 0 && oz > 0) errors.push(`${a.id} / ${b.id} gap ${(-ox).toFixed(2)}m < ${BUILDING_GAP}`);
    }
  }
  return errors;
}

if (process.env.NODE_ENV !== "production") {
  const errs = assertBuildingLayout();
  for (const e of errs) console.error(`[pusat layout] ${e}`);
}

export function doorSpot(b: Building) {
  const f = footprint(b);
  return { x: b.x, z: f.front + f.facing * 1.4, facing: f.facing };
}

/** Chunks covering the current cross (±42) plus connector stub. */
export function pusatChunks(): ChunkAABB[] {
  const id = PUSAT_LEPAK.id;
  const size = PUSAT_LEPAK.chunkSize;
  const out: ChunkAABB[] = [];
  for (const ix of [-1, 0]) {
    for (const iz of [-1, 0]) {
      out.push(makeChunkAABB(ix, iz, id, 10, size));
    }
  }
  // East connector toward Taman
  out.push(makeChunkAABB(1, -1, id, 6, size));
  out.push(makeChunkAABB(1, 0, id, 6, size));
  return out;
}
