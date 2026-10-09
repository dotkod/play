import { pathAlongRoads, type Vec2 } from "@/world/walk-spine";

/** Active tap-to-walk / map route (road-following polyline). */
let route: Vec2[] = [];
let cursor = 0;

export function setWalkRoute(from: Vec2, to: Vec2) {
  route = pathAlongRoads(from.x, from.z, to.x, to.z);
  cursor = 0;
}

export function clearWalkRoute() {
  route = [];
  cursor = 0;
}

export function getWalkRoute(): readonly Vec2[] {
  return route;
}

/** Next waypoint along the route, or null if done. */
export function currentWalkTarget(): Vec2 | null {
  while (cursor < route.length) {
    return route[cursor];
  }
  return null;
}

/** Advance when within `radius` of the current node. */
export function advanceWalkTarget(x: number, z: number, radius = 1.2) {
  const t = currentWalkTarget();
  if (!t) return;
  if (Math.hypot(t.x - x, t.z - z) < radius) cursor += 1;
}

export function walkRouteDone() {
  return cursor >= route.length;
}
