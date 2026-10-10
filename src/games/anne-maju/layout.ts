/**
 * Anne Maju's room, in the room's own frame: x across the shop, z from the back wall (-z) to
 * the street (+z), y up. Shared by the 3D scene, the city (which places this room inside the
 * restaurant building) and the city's colliders, so they always agree.
 */

/** Two rows of three tables, with aisles at x = ±1.55. */
export const TABLES: [number, number][] = [
  [-3.1, -1.0],
  [0, -1.0],
  [3.1, -1.0],
  [-3.1, 1.7],
  [0, 1.7],
  [3.1, 1.7],
];

/** Seat offsets from the table centre: back (faces the street), then left and right. */
export const SEATS: { x: number; z: number; rotY: number }[] = [
  { x: 0, z: -0.78, rotY: 0 },
  { x: -0.82, z: 0.05, rotY: Math.PI / 2 },
  { x: 0.82, z: 0.05, rotY: -Math.PI / 2 },
];

export const ANNE_HOME: [number, number] = [0, -2.75];
export const BUBBLE_Y = 2.2;
export const SHOP_W = 13;
export const BACK_WALL_Z = -5.3;
/** The shop front: where the room meets the five-foot way and street. */
export const FRONT_Z = 4.0;
export const COUNTER = { x: 0, z: -3.75, w: 6.6, d: 0.95 };
/** Radius around a table centre that its stools occupy. */
export const TABLE_R = 1.05;

/** The game camera: over the street, looking in at the tables and counter. */
export const GAME_CAMERA = { pos: [0, 7.4, 7.2] as const, look: [0, 0.4, -0.8] as const };
