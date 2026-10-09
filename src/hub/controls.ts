import { clearWalkRoute } from "@/core/walk-path";

// Shared, mutable input state read every frame by the player (no React re-renders while moving)
export const input = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0 }, // -1..1, y up = forward
  /** Look stick / pad: -1..1, positive = turn right */
  look: 0,
  target: null as { x: number; z: number } | null, // tap-to-walk destination (legacy single point)
  enter: false, // Enter/E pressed this frame
};

// Camera: cutaway + user yaw; talk = close-up on player + NPC (no dim overlay).
export const view = {
  cutaway: false,
  yaw: 0,
  talk: null as null | { npcId: string; x: number; z: number },
  /** Building ids currently hidden by cutaway — collision skips these so you don’t hit an invisible wall. */
  cutawayIds: new Set<string>(),
};

const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
const LOOK_LEFT = ["q", ",", "["];
const LOOK_RIGHT = ["r", ".", "]"];

export function bindKeyboard() {
  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    if (MOVE_KEYS.includes(k) || LOOK_LEFT.includes(k) || LOOK_RIGHT.includes(k)) {
      input.keys.add(k);
      if (MOVE_KEYS.includes(k)) {
        input.target = null;
        clearWalkRoute();
      }
      e.preventDefault();
    }
    if (k === "enter" || k === "e") input.enter = true;
  };
  const up = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
  const blur = () => {
    input.keys.clear();
    input.look = 0;
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}

/** -1..1 turn rate from keys + look pad (positive = right). */
export function lookAxis() {
  let x = input.look;
  const k = input.keys;
  if (LOOK_LEFT.some((c) => k.has(c))) x -= 1;
  if (LOOK_RIGHT.some((c) => k.has(c))) x += 1;
  return Math.max(-1, Math.min(1, x));
}

// Screen-relative move vector: x right, y forward (away from camera)
export function moveVector() {
  const k = input.keys;
  let x = input.joy.x;
  let y = input.joy.y;
  if (k.has("a") || k.has("arrowleft")) x -= 1;
  if (k.has("d") || k.has("arrowright")) x += 1;
  if (k.has("w") || k.has("arrowup")) y += 1;
  if (k.has("s") || k.has("arrowdown")) y -= 1;
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}
