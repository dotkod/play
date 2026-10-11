import { STATIONS } from "./stations";

export * from "./constants";
export * from "./path";
export * from "./stations";
export * from "./colliders";

const pusat = STATIONS[1]!;

/** Outer-north-sidewalk spawn at Stesen Pusat, facing the lift (north = -z). */
export const SPAWN = {
  x: (pusat.street.minX + pusat.street.maxX) / 2,
  z: pusat.street.maxZ - 0.45,
  rotY: Math.PI,
};
