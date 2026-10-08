// Layout of the Play city. Units are metres; y is up, the main road runs along x, the cross road along z.
// Malaysia drives on the left, so lanes are placed on the left of each direction of travel.

export const ROAD_HALF = 3; // carriageway: |coord| < 3
export const WALK_HALF = 6; // sidewalk: 3 < |coord| < 6
export const FRONT = 6.6; // building fronts start here
export const EXTENT = 42; // roads loop at ±EXTENT
export const BOUNDS = 38; // how far the player can walk
export const SIDEWALK_MID = (ROAD_HALF + WALK_HALF) / 2;

export type BuildingKind = "mamak" | "shophouse" | "lrt" | "mall";

export type Building = {
  id: string;
  kind: BuildingKind;
  // Sign text on the facade; game buildings also get a floating label
  sign: string;
  x: number;
  side: "north" | "south"; // north side faces +z (towards the road), south side faces -z
  w: number;
  d: number;
  h: number;
  color: string;
  // A game you can walk into, or one that's on the way
  game?: { slug: string; title: string; emoji: string };
  soon?: { title: string; emoji: string };
};

export const BUILDINGS: Building[] = [
  { id: "anne-maju", kind: "mamak", sign: "RESTORAN ANNE MAJU", x: 15, side: "north", w: 10, d: 8, h: 5, color: "#f4efe4", game: { slug: "anne-maju", title: "Anne Maju", emoji: "🍵" } },
  { id: "runcit", kind: "shophouse", sign: "KEDAI RUNCIT AH SENG", x: 26.5, side: "north", w: 8, d: 8, h: 6.5, color: "#f2c46b" },
  { id: "klinik", kind: "shophouse", sign: "KLINIK 24 JAM", x: 35, side: "north", w: 7, d: 8, h: 6, color: "#bfe1f2" },
  { id: "parking", kind: "mall", sign: "MEGA MALL", x: -20, side: "north", w: 18, d: 12, h: 9, color: "#d9d4f0" },
  { id: "kopitiam", kind: "shophouse", sign: "KOPITIAM", x: -34, side: "north", w: 7, d: 8, h: 6, color: "#f5b7a3" },
  { id: "lrt", kind: "lrt", sign: "STESEN LRT", x: -19, side: "south", w: 16, d: 9, h: 4.6, color: "#e6e9ec", soon: { title: "Stesen LRT", emoji: "🚇" } },
  { id: "gunting", kind: "shophouse", sign: "KEDAI GUNTING", x: -34, side: "south", w: 7, d: 8, h: 6, color: "#a8d8b0" },
  { id: "bank", kind: "shophouse", sign: "BANK", x: 14, side: "south", w: 9, d: 8, h: 7, color: "#e3e1dc" },
  { id: "kedai-kain", kind: "shophouse", sign: "KEDAI KAIN", x: 24, side: "south", w: 8, d: 8, h: 6.5, color: "#f3b6c9" },
  { id: "dobi", kind: "shophouse", sign: "DOBI", x: 33, side: "south", w: 7, d: 8, h: 6, color: "#c7b2e6" },
];

// Front edge and centre of a building's footprint
export function footprint(b: Building) {
  const dir = b.side === "north" ? -1 : 1; // which way the building extends away from the road
  const front = dir * FRONT;
  const cz = front + (dir * b.d) / 2;
  return { cx: b.x, cz, front, facing: -dir, minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: Math.min(front, front + dir * b.d), maxZ: Math.max(front, front + dir * b.d) };
}

// Standing spot just outside the entrance, used for the enter prompt and for spawning back from a game
export function doorSpot(b: Building) {
  const f = footprint(b);
  return { x: b.x, z: f.front + f.facing * 1.4, facing: f.facing };
}
