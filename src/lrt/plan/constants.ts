/** Elevated LRT sandbox metrics (metres). Track runs along +x; north is -z. */

/** Rail / train floor height. */
export const DECK_Y = 8;
/** Platform walking surface (slightly above rail). */
export const PLATFORM_Y = 8.12;
/** Guideway slab top under the rails. */
export const GUIDE_Y = 7.55;

/**
 * Guideway centreline z — north grass/junction belt of Pusat 3×3 so street plazas
 * meet the north sidewalks without planting lift cores on ped loops.
 * Sandbox and city share this plan so both fit ~±95 m.
 */
export const TRACK_Z = -90;
/** Side platform sits on the south (+z) of the track. */
export const PLATFORM_DEPTH = 5.5;
export const PLATFORM_ALONG = 28;
/** Track-side edge of the platform deck (shared by kit, colliders, PSD). */
export const PLAT_EDGE_Z = TRACK_Z + 1.6;
/** South edge of the platform deck. */
export const PLAT_BACK_Z = PLAT_EDGE_Z + PLATFORM_DEPTH;
/** Compressed spacing so 3 stops fit the city (~195 m). */
export const STATION_GAP = 72;

export const TRAIN_LEN = 16;
export const TRAIN_WIDTH = 3.4;
export const TRAIN_HEIGHT = 3.2;
/** Walkable aisle half-width inside the car (local x). */
export const CABIN_AISLE = 0.95;
export const CABIN_Z_HALF = 6.2;
/** Bench centre in car-local x (matches kit/train interior). */
export const BENCH_SEAT_X = TRAIN_WIDTH / 2 - 0.32;
/** Bench cushion top in car-local y (train root). */
export const BENCH_TOP_Y = 0.59;
/** Person root offset so seated hips rest on the cushion (HIP_SEAT ≈ 0.5). */
export const SEAT_ROOT_Y = BENCH_TOP_Y - 0.48;
/** Half-width of the boarding door gap (platform screen doors + train doors). */
export const DOOR_HALF = 1.4;

export const FARE_SEN = 120;
export const LINE_COLOR = "#c62f25";

export const DWELL_S = 12;
export const CRUISE_SPEED = 18;
export const APPROACH_SPEED = 6;
