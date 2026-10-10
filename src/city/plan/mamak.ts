/**
 * Anne Maju's room inside its city building. The game's room frame (see
 * games/anne-maju/layout.ts) is turned so its street side lines up with the shopfront.
 */

import { BACK_WALL_Z, COUNTER, FRONT_Z, SHOP_W, TABLE_R, TABLES } from "@/games/anne-maju/layout";
import { rect, type Rect } from "./grid";
import type { CityBuilding } from "./lots";

export type RoomFrame = { x: number; z: number; rotY: number };

export function roomFrame(b: CityBuilding): RoomFrame {
  const cx = (b.rect.minX + b.rect.maxX) / 2;
  return b.facing === "s" ? { x: cx, z: b.rect.maxZ - FRONT_Z, rotY: 0 } : { x: cx, z: b.rect.minZ + FRONT_Z, rotY: Math.PI };
}

/** Room coordinates → world. */
export function roomToWorld(f: RoomFrame, lx: number, lz: number) {
  const c = Math.cos(f.rotY);
  const s = Math.sin(f.rotY);
  return { x: f.x + lx * c + lz * s, z: f.z - lx * s + lz * c };
}

/** Depth from the shopfront to the room's back wall. */
export const ROOM_DEPTH = FRONT_Z - BACK_WALL_Z;
export const SIDE_WALL = 0.3;

/** The walkable inside of the restaurant (world rect), for "you're inside" checks. */
export function roomRect(b: CityBuilding): Rect {
  const r = b.rect;
  return b.facing === "s"
    ? rect(r.minX + SIDE_WALL, r.maxX - SIDE_WALL, r.maxZ - ROOM_DEPTH, r.maxZ)
    : rect(r.minX + SIDE_WALL, r.maxX - SIDE_WALL, r.minZ, r.minZ + ROOM_DEPTH);
}

/** Kitchen/back-of-house block behind the room's back wall. */
export function backBlock(b: CityBuilding): Rect {
  const r = b.rect;
  return b.facing === "s" ? { ...r, maxZ: r.maxZ - ROOM_DEPTH } : { ...r, minZ: r.minZ + ROOM_DEPTH };
}

/** Collision inside the room: side walls, counter, tables with their stools, corner plants. */
export function roomColliders(b: CityBuilding) {
  const f = roomFrame(b);
  const room = roomRect(b);
  const boxes: { id: string; rect: Rect }[] = [
    { id: `${b.id}-wall-w`, rect: { ...room, minX: b.rect.minX, maxX: room.minX } },
    { id: `${b.id}-wall-e`, rect: { ...room, minX: room.maxX, maxX: b.rect.maxX } },
  ];
  const c0 = roomToWorld(f, COUNTER.x - COUNTER.w / 2, COUNTER.z - COUNTER.d / 2);
  const c1 = roomToWorld(f, COUNTER.x + COUNTER.w / 2, COUNTER.z + COUNTER.d / 2);
  boxes.push({ id: `${b.id}-counter`, rect: rect(Math.min(c0.x, c1.x), Math.max(c0.x, c1.x), Math.min(c0.z, c1.z), Math.max(c0.z, c1.z)) });
  const circles = TABLES.map(([x, z], i) => ({ id: `${b.id}-table${i}`, ...roomToWorld(f, x, z), r: TABLE_R }));
  for (const [x, z] of [
    [-SHOP_W / 2 + 0.6, 3.4],
    [SHOP_W / 2 - 0.6, 3.4],
  ])
    circles.push({ id: `${b.id}-plant${x > 0 ? "e" : "w"}`, ...roomToWorld(f, x, z), r: 0.45 });
  return { boxes, circles };
}
