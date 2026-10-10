/**
 * What stands on each block. Buildings are cut from the block's lot, so they can never
 * reach the sidewalk or road. Shophouse blocks hold two back-to-back rows with a service
 * lane between them; office blocks hold one tower or mall on a paved plaza; parks are open.
 */

import { type Block, type Grid, rect, type Rect } from "./grid";

export type Facing = "n" | "s" | "e" | "w";
export type BuildingKind = "shophouse" | "mamak" | "office" | "mall";
export type BlockKind = "shophouse" | "office" | "mall" | "park";

export type Interior = { title: string; emoji: string; blurbMs: string; blurbEn: string };

export type CityBuilding = {
  id: string;
  kind: BuildingKind;
  /** Full footprint, including the five-foot way under the first floor. */
  rect: Rect;
  facing: Facing;
  floors: number;
  color: string;
  trim: string;
  sign: string;
  signBg: string;
  signFg: string;
  /** Depth of the covered five-foot way at the front (walkable, pillars on the kerb side). */
  arcade: number;
  /** Where to stand to use the door. */
  door: { x: number; z: number };
  /** Buildings merged into one mesh share a group (a shophouse row, or a tower). */
  group: string;
  interior?: Interior;
  game?: { slug: string; title: string; emoji: string };
};

export const FLOOR_H = 3.4;
export const GROUND_H = 3.8;
export const ROW_DEPTH = 13;
export const ARCADE = 2.4;

export function buildingHeight(b: Pick<CityBuilding, "floors">) {
  return GROUND_H + (b.floors - 1) * FLOOR_H;
}

const PASTELS = ["#f2c46b", "#bfe1f2", "#f5b7a3", "#a8d8b0", "#f3b6c9", "#c7b2e6", "#e8a87c", "#9fd4c8", "#fde68a", "#d9d4f0", "#f4efe4", "#b9e4c9"];
const SIGN_COLOURS: [string, string][] = [
  ["#c8372b", "#fff4d6"],
  ["#1f5fa8", "#ffffff"],
  ["#1f6b4a", "#fff4d6"],
  ["#7a3208", "#fde68a"],
  ["#3d2460", "#fbf3e4"],
  ["#1f1a17", "#fcd34d"],
];

const INTERIORS: Record<string, Interior> = {
  "KEDAI RUNCIT AH SENG": { title: "Kedai Runcit Ah Seng", emoji: "🛒", blurbMs: "Rak penuh barang runcit. Ah Seng tengah kira duit.", blurbEn: "Shelves packed with groceries. Ah Seng is counting change." },
  "KLINIK 24 JAM": { title: "Klinik 24 Jam", emoji: "🏥", blurbMs: "Bau antiseptik. Nombor giliran 47… kau nombor 48.", blurbEn: "Smells like antiseptic. Queue number 47… you're 48." },
  KOPITIAM: { title: "Kopitiam", emoji: "☕", blurbMs: "Meja marble, telur setengah masak, kopi kau dingin sikit.", blurbEn: "Marble tables, half-boiled eggs, your kopi's going cold." },
  "KEDAI GUNTING": { title: "Kedai Gunting", emoji: "✂️", blurbMs: "Cermin besar, radio perlahan. 'Potong pendek?'", blurbEn: "Big mirrors, soft radio. 'Short trim?'" },
  BANK: { title: "Bank", emoji: "🏦", blurbMs: "Queue panjang. Ting-ting. Ambil nombor dulu.", blurbEn: "Long queue. Ding. Take a number first." },
  "KEDAI KAIN": { title: "Kedai Kain", emoji: "🧵", blurbMs: "Kain bergulung sampai siling. 'Ini batik original eh.'", blurbEn: "Bolts of cloth to the ceiling. 'This batik is original.'" },
  DOBI: { title: "Dobi", emoji: "👕", blurbMs: "Bau detergen, mesin berputar. Tiket kau kat kaunter.", blurbEn: "Detergent smell, machines spinning. Your ticket's at the counter." },
  "WARUNG MAK": { title: "Warung Mak", emoji: "🍛", blurbMs: "Nasi panas, lauk empat jenis. Mak senyum dari belakang.", blurbEn: "Hot rice, four sides. Mak smiles from the back." },
  FARMASI: { title: "Farmasi", emoji: "💊", blurbMs: "Vitamin, plaster, ubat batuk. 'Ada preskripsi?'", blurbEn: "Vitamins, plasters, cough syrup. 'Got a prescription?'" },
  "MEGA MALL": { title: "Mega Mall", emoji: "🏬", blurbMs: "AC kuat gila. Eskalator naik, muzik mall berulang.", blurbEn: "Freezing AC. Escalators up, mall muzak on loop." },
};

const SHOP_NAMES = [
  "KEDAI RUNCIT AH SENG",
  "KLINIK 24 JAM",
  "KOPITIAM",
  "KEDAI GUNTING",
  "BANK",
  "KEDAI KAIN",
  "DOBI",
  "WARUNG MAK",
  "FARMASI",
  "KEDAI TELEFON",
  "BAKERI SEDAP",
  "KEDAI BASIKAL",
  "CERMIN MATA",
  "KEDAI BUKU",
  "KEDAI EMAS",
  "TOMYAM CORNER",
  "KEDAI HARDWARE",
  "KEDAI BUNGA",
  "CENDOL PAK ALI",
  "TUISYEN CEMERLANG",
  "KEDAI KASUT",
  "ROTI BAKAR",
  "KEDAI MAINAN",
  "SPA KAKI",
];

/** Tiny seeded RNG (mulberry32) so the city is identical on every device. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Front edge position and inward direction for a facing. */
function doorSpot(r: Rect, facing: Facing, along: number) {
  switch (facing) {
    case "n":
      return { x: along, z: r.minZ + 1.0 };
    case "s":
      return { x: along, z: r.maxZ - 1.0 };
    case "w":
      return { x: r.minX + 1.0, z: along };
    case "e":
      return { x: r.maxX - 1.0, z: along };
  }
}

export type LotPlan = Record<string, BlockKind>;

export type Lots = { buildings: CityBuilding[]; blockKinds: Map<string, BlockKind> };

/** Splits a row length into shop widths between 6 and 7.4 m. */
function unitWidths(length: number, rnd: () => number) {
  const n = Math.max(1, Math.round(length / 6.6));
  const raw = Array.from({ length: n }, () => 0.9 + rnd() * 0.2);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => (r / sum) * length);
}

export function planLots(grid: Grid, kinds: LotPlan, mamakBlock: string): Lots {
  const rnd = seeded(20261010);
  const buildings: CityBuilding[] = [];
  const blockKinds = new Map<string, BlockKind>();
  let shopIdx = 0;

  const shopRow = (b: Block, facing: "n" | "s") => {
    const r = b.lot;
    const minZ = facing === "n" ? r.minZ : r.maxZ - ROW_DEPTH;
    const maxZ = minZ + ROW_DEPTH;
    const widths = unitWidths(r.maxX - r.minX, rnd);
    const group = `${b.id}-${facing}`;
    const rowFloors = 2 + Math.floor(rnd() * 2);
    let x = r.minX;
    let mamakLeft = b.id === mamakBlock && facing === "n" ? 2 : 0;
    for (let k = 0; k < widths.length; k++) {
      // Anne Maju takes the two corner units at the west end of its row
      if (mamakLeft === 2) {
        const w = widths[0] + widths[1];
        const ur = rect(x, x + w, minZ, maxZ);
        buildings.push({
          id: "anne-maju",
          kind: "mamak",
          rect: ur,
          facing,
          floors: 2,
          color: "#f4efe4",
          trim: "#2f8f4e",
          sign: "RESTORAN ANNE MAJU",
          signBg: "#c62f25",
          signFg: "#f6d13a",
          // Open-fronted: the whole ground floor is the restaurant (see plan/mamak.ts)
          arcade: 0,
          // Entrance mat just outside the open front (the room's tables start right inside)
          door: { x: x + w / 2, z: facing === "n" ? ur.minZ - 0.8 : ur.maxZ + 0.8 },
          group,
          game: { slug: "anne-maju", title: "Anne Maju", emoji: "🍵" },
        });
        x += w;
        k++;
        mamakLeft = 0;
        continue;
      }
      const w = widths[k];
      const ur = rect(x, x + w, minZ, maxZ);
      const name = SHOP_NAMES[shopIdx % SHOP_NAMES.length];
      const [signBg, signFg] = SIGN_COLOURS[shopIdx % SIGN_COLOURS.length];
      buildings.push({
        id: `${group}-${k}`,
        kind: "shophouse",
        rect: ur,
        facing,
        floors: rowFloors,
        color: PASTELS[Math.floor(rnd() * PASTELS.length)],
        trim: "#f7f3ea",
        sign: name,
        signBg,
        signFg,
        arcade: ARCADE,
        door: doorSpot(ur, facing, x + w / 2),
        group,
        interior: shopIdx < SHOP_NAMES.length ? INTERIORS[name] : undefined,
      });
      shopIdx++;
      x += w;
    }
  };

  const tower = (b: Block, kind: "office" | "mall", name: string, w: number, d: number, floors: number, facing: Facing, color: string) => {
    const c = { x: (b.lot.minX + b.lot.maxX) / 2, z: (b.lot.minZ + b.lot.maxZ) / 2 };
    // Pull the tower toward its entrance street so the plaza sits behind and beside it
    const shift = (b.lot.maxZ - b.lot.minZ - d) / 2 - 2;
    const cz = facing === "s" ? c.z + shift : facing === "n" ? c.z - shift : c.z;
    const r = rect(c.x - w / 2, c.x + w / 2, cz - d / 2, cz + d / 2);
    buildings.push({
      id: `${b.id}-${kind}`,
      kind,
      rect: r,
      facing,
      floors,
      color,
      trim: "#e8eef4",
      sign: name,
      signBg: "#1f1a17",
      signFg: "#fbf3e4",
      arcade: 0,
      door: doorSpot(grow1(r, facing), facing, facing === "n" || facing === "s" ? c.x : cz),
      group: `${b.id}-${kind}`,
      interior: INTERIORS[name],
    });
  };

  for (const b of grid.blocks) {
    const kind = kinds[b.id] ?? "park";
    blockKinds.set(b.id, kind);
    if (kind === "shophouse") {
      shopRow(b, "n");
      shopRow(b, "s");
    } else if (kind === "office") {
      const names = ["WISMA SANTAI", "MENARA LEPAK HOLDINGS", "PLAZA REHAT"];
      const name = names[(b.bx + b.bz) % names.length];
      tower(b, "office", name, 18, 15, 8 + Math.floor(rnd() * 5), b.bz === 0 ? "s" : "n", ["#c5ced8", "#b8c4d0", "#a8c4d8"][b.bx % 3]);
    } else if (kind === "mall") {
      tower(b, "mall", "MEGA MALL", 27, 20, 3, "n", "#d9d4f0");
    }
  }
  return { buildings, blockKinds };
}

/** The door stands just outside the facade (towers have no arcade). */
function grow1(r: Rect, facing: Facing): Rect {
  switch (facing) {
    case "n":
      return { ...r, minZ: r.minZ - 2 };
    case "s":
      return { ...r, maxZ: r.maxZ + 2 };
    case "w":
      return { ...r, minX: r.minX - 2 };
    case "e":
      return { ...r, maxX: r.maxX + 2 };
  }
}
