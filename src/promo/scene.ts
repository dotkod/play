/**
 * Shared setup for marketing renders: camera paths, time of day and a busy Anne Maju.
 * Everything is placed from the city plan, so shots stay right as the city changes.
 */

import * as THREE from "three";
import { cityCamera } from "@/city/components/camera-override";
import { BUILDINGS, roomFrame, roomToWorld } from "@/city/plan";
import { GAME_CAMERA } from "@/games/anne-maju/layout";
import { type GameState, initialState, type Party } from "@/games/anne-maju/state";
import { seedRandom, unseedRandom } from "@/shared/rng";
import { randomLook } from "@/shared/three/look";
import { clock } from "@/world/lighting";

export const ANNE = BUILDINGS.find((b) => b.kind === "mamak")!;
export const ANNE_CX = (ANNE.rect.minX + ANNE.rect.maxX) / 2;
/** The serving view inside the restaurant (same as the game). */
export function servingView() {
  const f = roomFrame(ANNE);
  const p = roomToWorld(f, GAME_CAMERA.pos[0], GAME_CAMERA.pos[2]);
  const l = roomToWorld(f, GAME_CAMERA.look[0], GAME_CAMERA.look[2]);
  return { pos: new THREE.Vector3(p.x, GAME_CAMERA.pos[1], p.z), look: new THREE.Vector3(l.x, GAME_CAMERA.look[1], l.z) };
}

/** 0..1 of a day: 0.45 ≈ 10:48, 0.72 ≈ 17:17 (golden), 0.875 = 21:00. */
export function setTimeOfDay(frac: number) {
  clock.frozen = true;
  clock.dayFrac = frac;
}

/** Hide the restaurant shell (as the game does) while the camera is inside it. */
export function insideShop(on: boolean) {
  if (on) {
    const v = servingView();
    cityCamera.shot = {
      pos: { x: v.pos.x, y: v.pos.y, z: v.pos.z },
      look: { x: v.look.x, y: v.look.y, z: v.look.z },
      fitHalfWidth: 5.9,
      fitDistance: 9.6,
      panel: { side: "right", px: 0 },
    };
  } else cityCamera.shot = null;
}

/** A lunchtime crowd: four tables seated, nobody angry, nobody leaving. */
export function busyMamak(): GameState {
  seedRandom(1957);
  const far = Date.now() + 1e10;
  const orders = [
    { temp: "panas", base: "teh", milk: "susu", sugar: "kurang" },
    { temp: "ais", base: "milo", milk: "susu", sugar: "biasa" },
    { temp: "panas", base: "kopi", milk: "o", sugar: "kosong" },
    { temp: "ais", base: "teh", milk: "c", sugar: "biasa" },
  ] as const;
  const seated: [number, number][] = [
    [0, 1],
    [1, 2],
    [3, 3],
    [4, 2],
    [5, 1],
  ];
  const tables: (Party | null)[] = Array(6).fill(null);
  seated.forEach(([table, n], k) => {
    tables[table] = {
      id: k + 1,
      guests: Array.from({ length: n }, (_, g) => ({ look: randomLook(), order: { ...orders[(k + g) % orders.length] }, served: false })),
      seed: k,
      arrivedAt: 0,
      seatedAt: 0,
      revealUntil: 0,
      patienceMs: 1e10,
      leaveAt: far,
      asks: 0,
    };
  });
  unseedRandom();
  return { ...initialState, phase: "playing", tables, startAt: Date.now(), now: Date.now() };
}

export type Key = { t: number; pos: [number, number, number]; look: [number, number, number] };

const ease = (k: number) => k * k * (3 - 2 * k);

/** Camera along keyframes with smoothstep easing between them. */
export function cameraAt(keys: Key[], t: number) {
  if (t <= keys[0].t) return { pos: new THREE.Vector3(...keys[0].pos), look: new THREE.Vector3(...keys[0].look) };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const k = ease((t - a.t) / (b.t - a.t));
      return {
        pos: new THREE.Vector3(...a.pos).lerp(new THREE.Vector3(...b.pos), k),
        look: new THREE.Vector3(...a.look).lerp(new THREE.Vector3(...b.look), k),
      };
    }
  }
  const z = keys[keys.length - 1];
  return { pos: new THREE.Vector3(...z.pos), look: new THREE.Vector3(...z.look) };
}
