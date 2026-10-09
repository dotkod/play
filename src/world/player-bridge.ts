/** Shared per-frame player state for traffic, cats, lighting follow, phone pose. */

export const player = {
  x: 0,
  z: 0,
  rot: 0,
  crouchUntil: 0,
  phoneDrawUntil: 0,
  phoneHeld: false,
  districtId: "pusat-lepak" as string,
};

export const PHONE_DRAW_MS = 720;

let teleportQueue: { x: number; z: number; rotY: number } | null = null;

export function requestTeleport(x: number, z: number, rotY = 0) {
  teleportQueue = { x, z, rotY };
}

export function takeTeleport() {
  const t = teleportQueue;
  teleportQueue = null;
  return t;
}
