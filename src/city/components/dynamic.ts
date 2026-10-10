/** Moving things the player collides with, refreshed every frame by traffic and pedestrians. */

import type { Obstacle } from "../sim/traffic";

export const cityDynamic = {
  vehicles: [] as Obstacle[],
  people: [] as Obstacle[],
};
