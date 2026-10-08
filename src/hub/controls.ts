// Shared, mutable input state read every frame by the player (no React re-renders while moving)
export const input = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0 }, // -1..1, y up = forward
  target: null as { x: number; z: number } | null, // tap-to-walk destination
  enter: false, // Enter/E pressed this frame
};

// Camera state other systems care about: the cutaway only applies to the low follow camera
export const view = { cutaway: false };

const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

export function bindKeyboard() {
  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    if (MOVE_KEYS.includes(k)) {
      input.keys.add(k);
      input.target = null;
      e.preventDefault();
    }
    if (k === "enter" || k === "e") input.enter = true;
  };
  const up = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
  const blur = () => input.keys.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
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
