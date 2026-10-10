/**
 * Build many toon-shaded parts into ONE mesh plus ONE outline mesh.
 *
 * A shophouse row or a car is ~40 boxes; drawn one by one (with outlines) that's 80 draw
 * calls. Merged it's 2, which is what keeps the city smooth on phones. Colours live in a
 * vertex attribute so one shared material covers everything.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toonGradient } from "@/shared/three/toon";

export type Vec3 = [number, number, number];

type Common = {
  pos: Vec3;
  /** Rotation around y (radians). */
  rotY?: number;
  /** Rotation around x, then z (radians), for tilted roofs and wheels. */
  rotX?: number;
  rotZ?: number;
  color: string;
  /** Skip the ink outline for small details (window glass, stripes). */
  outline?: boolean;
  /** Emissive-ish parts (lamp heads, lit windows) are listed separately by callers. */
};

export type Part =
  | (Common & { shape: "box"; size: Vec3 })
  | (Common & { shape: "cyl"; top: number; bottom: number; height: number; segments?: number })
  | (Common & { shape: "ball"; radius: number; segments?: number });

export const box = (size: Vec3, pos: Vec3, color: string, extra: Partial<Common> = {}): Part => ({ shape: "box", size, pos, color, ...extra });
export const cyl = (top: number, bottom: number, height: number, pos: Vec3, color: string, extra: Partial<Common> & { segments?: number } = {}): Part => ({
  shape: "cyl",
  top,
  bottom,
  height,
  pos,
  color,
  ...extra,
});
export const ball = (radius: number, pos: Vec3, color: string, extra: Partial<Common> & { segments?: number } = {}): Part => ({ shape: "ball", radius, pos, color, ...extra });

function rawGeometry(p: Part): THREE.BufferGeometry {
  if (p.shape === "box") return new THREE.BoxGeometry(...p.size);
  if (p.shape === "cyl") return new THREE.CylinderGeometry(p.top, p.bottom, p.height, p.segments ?? 12);
  return new THREE.SphereGeometry(p.radius, p.segments ?? 12, Math.max(6, Math.round((p.segments ?? 12) * 0.7)));
}

function extent(p: Part): Vec3 {
  if (p.shape === "box") return p.size;
  if (p.shape === "cyl") {
    const r = Math.max(p.top, p.bottom) * 2;
    return [r, p.height, r];
  }
  return [p.radius * 2, p.radius * 2, p.radius * 2];
}

const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();

function place(g: THREE.BufferGeometry, p: Part, scale: Vec3 = [1, 1, 1]) {
  tmpEuler.set(p.rotX ?? 0, p.rotY ?? 0, p.rotZ ?? 0, "YXZ");
  tmpQuat.setFromEuler(tmpEuler);
  tmpPos.set(...p.pos);
  tmpScale.set(...scale);
  tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
  g.applyMatrix4(tmpMatrix);
  return g;
}

function painted(g: THREE.BufferGeometry, hex: string) {
  tmpColor.set(hex);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute("uv");
  return g;
}

/** Ink outline thickness in metres; buildings read better with a slightly heavier line. */
export function mergeParts(parts: Part[], outline = 0.03) {
  const body = mergeGeometries(parts.map((p) => painted(place(rawGeometry(p), p), p.color)));
  const hullParts = parts
    .filter((p) => p.outline !== false)
    .map((p) => {
      const e = extent(p);
      const g = place(rawGeometry(p), p, [(e[0] + outline * 2) / e[0], (e[1] + outline * 2) / e[1], (e[2] + outline * 2) / e[2]]);
      g.deleteAttribute("uv");
      g.deleteAttribute("normal");
      return g;
    });
  const hull = hullParts.length ? mergeGeometries(hullParts) : null;
  body.computeBoundingSphere();
  hull?.computeBoundingSphere();
  return { body, hull };
}

let toonMat: THREE.MeshToonMaterial | null = null;
let hullMat: THREE.MeshBasicMaterial | null = null;
let glowMat: THREE.MeshBasicMaterial | null = null;

/** One toon material for every merged mesh (colour comes from the vertices). */
export function kitMaterial() {
  toonMat ??= new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
  return toonMat;
}

export function hullMaterial() {
  hullMat ??= new THREE.MeshBasicMaterial({ color: "#151515", side: THREE.BackSide });
  return hullMat;
}

/** Unlit vertex-coloured material for lamp heads, lit windows and signal bulbs. */
export function glowMaterial() {
  glowMat ??= new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  return glowMat;
}

/** Merge unlit parts (no outline) into one geometry. */
export function mergeGlow(parts: Part[]) {
  return mergeGeometries(parts.map((p) => painted(place(rawGeometry(p), p), p.color)));
}

const cache = new Map<string, ReturnType<typeof mergeParts>>();

/** Build once per key: identical models (same car paint, same lamp) share geometry. */
export function cachedParts(key: string, build: () => Part[], outline?: number) {
  let hit = cache.get(key);
  if (!hit) {
    hit = mergeParts(build(), outline);
    cache.set(key, hit);
  }
  return hit;
}
