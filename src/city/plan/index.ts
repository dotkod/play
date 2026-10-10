/**
 * The v2 city plan: Pusat Lepak, 3×3 blocks. Pure data, built once at import.
 *
 * Block layout (north at the top):
 *   office    shophouse  office
 *   shophouse park       shophouse*   (* Anne Maju on the corner)
 *   shophouse shophouse  mall
 */

import { makeColliders } from "./colliders";
import { makeGrid } from "./grid";
import { makeLanes } from "./lanes";
import { planLots } from "./lots";
import { planStreets } from "./props";

export const GRID = makeGrid(3, 3);

const LOTS = planLots(
  GRID,
  {
    "b0-0": "office",
    "b1-0": "shophouse",
    "b2-0": "office",
    "b0-1": "shophouse",
    "b1-1": "park",
    "b2-1": "shophouse",
    "b0-2": "shophouse",
    "b1-2": "shophouse",
    "b2-2": "mall",
  },
  "b2-1",
);

export const BUILDINGS = LOTS.buildings;
export const BLOCK_KINDS = LOTS.blockKinds;
export const STREETS = planStreets(GRID, BUILDINGS, BLOCK_KINDS);
export const COLLIDERS = makeColliders(BUILDINGS, STREETS.props, STREETS.signals);
export const LANES = makeLanes(GRID);

const anne = BUILDINGS.find((b) => b.id === "anne-maju")!;
/** New sessions start on the sidewalk outside Anne Maju, facing the shop. */
export const SPAWN = { x: anne.door.x + 3, z: anne.rect.minZ - 2.6, rotY: Math.PI };

export * from "./grid";
export * from "./lots";
export * from "./props";
export * from "./lanes";
export * from "./colliders";
export * from "./mamak";
