// Module-level goal for the ground guide arrow / maps (read every frame).
// Task engine owns the story pin; the player can override with a manual wayfinder.

export type Waypoint = { x: number; z: number; label?: string } | null;

let taskPin: Waypoint = null;
let userPin: Waypoint = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Active guide: manual pin wins over task. */
export function getWaypoint() {
  return userPin ?? taskPin;
}

export function getTaskWaypoint() {
  return taskPin;
}

export function getUserWaypoint() {
  return userPin;
}

/** Used by the task engine. */
export function setWaypoint(next: Waypoint) {
  taskPin = next;
  notify();
}

/** Manual pin from the city map. Clears when the player arrives. */
export function setUserWaypoint(next: Waypoint) {
  userPin = next;
  notify();
}

export function clearUserWaypoint() {
  if (!userPin) return;
  userPin = null;
  notify();
}

export function onWaypoint(handler: () => void) {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
