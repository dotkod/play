"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Look } from "@/shared/three/look";
import {
  advanceWalkTarget,
  clearWalkRoute,
  currentWalkTarget,
  walkRouteDone,
} from "@/core/walk-path";
import { clearUserWaypoint, getUserWaypoint, getWaypoint } from "@/core/waypoint";
import { currentOutfit } from "@/games/anne-maju/progress";
import { sfx } from "@/shared/audio";
import { Person, type Pose } from "@/shared/three/person";
import { type Circle, dynamicColliders, staticColliders } from "./colliders";
import { input, lookAxis, moveVector, view } from "./controls";
import { WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_X, WORLD_MIN_Z } from "@/world/bounds";
import { TOWER_L, TOWER_R } from "@/world/districts/klcc/meta";
import { TOWER_POS as MENARA_TOWER } from "@/world/districts/menara-lepak/meta";
import { TERRACES } from "@/world/districts/taman-ceria/layout";
import { takeTeleport } from "@/world/player-bridge";
import { PHONE_DRAW_MS, player as playerShared } from "./traffic";
import { type Building, BUILDINGS, doorSpot, footprint } from "./world-data";

const SPEED = 6;
const RADIUS = 0.45;
const PLAYER_LOOK: Look = { skin: "#c98d60", shirt: "#fcd34d", pants: "#2a2a33", headwear: "short", hair: "#2b2018" };

const DOOR_HALF = 1.25; // doorway width so you can step into enterable shops

type Box = { minX: number; maxX: number; minZ: number; maxZ: number; door?: { x0: number; x1: number; z0: number; z1: number } };

// Solid footprints, slightly inflated; enterable buildings keep a front door notch
const solids: Box[] = [
  ...BUILDINGS.map((b) => {
    const f = footprint(b);
    const box: Box = { minX: f.minX - RADIUS, maxX: f.maxX + RADIUS, minZ: f.minZ - RADIUS, maxZ: f.maxZ + RADIUS };
    if (b.game || b.interior || b.lrt) {
      const depth = 1.6 + RADIUS;
      if (b.side === "north") {
        box.door = { x0: b.x - DOOR_HALF, x1: b.x + DOOR_HALF, z0: f.front - depth, z1: f.front + RADIUS + 0.2 };
      } else {
        box.door = { x0: b.x - DOOR_HALF, x1: b.x + DOOR_HALF, z0: f.front - RADIUS - 0.2, z1: f.front + depth };
      }
    }
    return box;
  }),
  ...TERRACES.map((t) => ({
    minX: t.x - t.w / 2 - RADIUS,
    maxX: t.x + t.w / 2 + RADIUS,
    minZ: t.z - t.d / 2 - RADIUS,
    maxZ: t.z + t.d / 2 + RADIUS,
  })),
  ...[TOWER_L, TOWER_R].map((t) => ({
    minX: t.x - 3.8 - RADIUS,
    maxX: t.x + 3.8 + RADIUS,
    minZ: t.z - 3.8 - RADIUS,
    maxZ: t.z + 3.8 + RADIUS,
  })),
  {
    minX: MENARA_TOWER.x - 5 - RADIUS,
    maxX: MENARA_TOWER.x + 5 + RADIUS,
    minZ: MENARA_TOWER.z - 5 - RADIUS,
    maxZ: MENARA_TOWER.z + 5 + RADIUS,
  },
];
const blocked = (x: number, z: number) =>
  solids.some((s) => {
    if (!(x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ)) return false;
    if (s.door && x > s.door.x0 && x < s.door.x1 && z > s.door.z0 && z < s.door.z1) return false;
    return true;
  });

// Push the player out of any overlapping circle; returns true if something was in the way
function pushOut(p: THREE.Vector3, list: Circle[]) {
  let hit = false;
  for (const c of list) {
    if (!c) continue;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const min = c.r + RADIUS;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 0.0001;
    const nx = p.x + (dx / d) * (min - d);
    const nz = p.z + (dz / d) * (min - d);
    // Never get shoved into a wall
    if (!blocked(nx, nz)) {
      p.x = nx;
      p.z = nz;
    }
    hit = true;
  }
  return hit;
}

// Door zones for buildings you can walk into (jobs, interiors, LRT, soon)
const zones = BUILDINGS.filter((b) => b.game || b.soon || b.lrt || b.interior).map((b) => ({ b, spot: doorSpot(b) }));
// Fallback goal: Anne Maju door when no task waypoint is set
const fallbackGoal = doorSpot(BUILDINGS.find((b) => b.game)!);

export function Player({
  spawn,
  onZone,
  followCamera = true,
  active = true,
}: {
  spawn: { x: number; z: number; rotY: number };
  onZone: (b: Building | null) => void;
  followCamera?: boolean;
  // False while the start screen is up: no movement, camera circles the junction instead
  active?: boolean;
}) {
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const rot = useRef(spawn.rotY);
  const moving = useRef(false);
  const zone = useRef<string | null>(null);
  const stride = useRef({ dist: 0, alt: false });
  // User-controlled camera yaw only (Q/R or look pad) — never auto-rotates
  const camBoot = useRef(false);
  const ring = useRef<THREE.Mesh>(null);
  const guide = useRef<THREE.Group>(null);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const aspect = useThree((s) => s.size.width / s.size.height);

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = pos.current;
    if (!camBoot.current) {
      camBoot.current = true;
      view.yaw = spawn.z > 3 ? Math.PI : 0;
    }

    const tp = takeTeleport();
    if (tp) {
      p.x = tp.x;
      p.z = tp.z;
      rot.current = tp.rotY;
      // Keep camera yaw — user looks where they chose (no auto snap)
      input.target = null;
    }

    const talking = view.talk != null;
    view.cutaway = active && followCamera && !talking;
    if (!active) {
      // Attract mode: slow orbit over the junction behind the start screen
      input.target = null;
      playerShared.x = p.x;
      playerShared.z = p.z;
      if (followCamera) {
        const a = clock.elapsedTime * 0.08;
        camera.position.set(Math.sin(a) * 26, 18, Math.cos(a) * 26);
        camera.lookAt(4, 0, -2);
      }
      return;
    }

    // Freeze while phone / dialogue (camera still runs for talk close-up)
    const onPhone = playerShared.phoneHeld || Date.now() < playerShared.phoneDrawUntil;
    if (!onPhone && !talking) {
      const turn = lookAxis();
      if (turn !== 0) view.yaw += turn * 2.2 * dt;
    }
    const mv = onPhone || talking ? { x: 0, y: 0 } : moveVector();
    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);
    let vx = mv.x * cy - mv.y * sy;
    let vz = -mv.x * sy - mv.y * cy;
    if (onPhone) {
      input.target = null;
      clearWalkRoute();
    }
    // Prefer road-following route; fall back to single tap target
    if (vx === 0 && vz === 0) {
      advanceWalkTarget(p.x, p.z);
      const step = currentWalkTarget() ?? input.target;
      if (step) {
        const dx = step.x - p.x;
        const dz = step.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.25) {
          if (input.target && !currentWalkTarget()) input.target = null;
        } else {
          vx = dx / d;
          vz = dz / d;
        }
      }
      if (walkRouteDone() && !input.target) clearWalkRoute();
    }
    moving.current = vx !== 0 || vz !== 0;
    // Walking off cancels a petting crouch
    if (moving.current) playerShared.crouchUntil = 0;
    if (moving.current) {
      const nx = THREE.MathUtils.clamp(p.x + vx * SPEED * dt, WORLD_MIN_X, WORLD_MAX_X);
      const nz = THREE.MathUtils.clamp(p.z + vz * SPEED * dt, WORLD_MIN_Z, WORLD_MAX_Z);
      // Slide along walls: try each axis separately
      const ox = p.x;
      const oz = p.z;
      if (!blocked(nx, p.z)) p.x = nx;
      if (!blocked(p.x, nz)) p.z = nz;
      // A footstep every ~1.1 m actually travelled
      stride.current.dist += Math.hypot(p.x - ox, p.z - oz);
      if (stride.current.dist > 1.1) {
        stride.current.dist = 0;
        stride.current.alt = !stride.current.alt;
        sfx.step(stride.current.alt);
      }
      if (blocked(nx, nz)) {
        input.target = null;
        clearWalkRoute();
      }
      const want = Math.atan2(vx, vz);
      let diff = want - rot.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      rot.current += diff * Math.min(1, dt * 12);
    }
    // Solid tables, poles and trees, then anything moving (vehicles nudge you out of their way)
    const bumped = pushOut(p, staticColliders) || pushOut(p, dynamicColliders.people);
    pushOut(p, dynamicColliders.vehicles);
    pushOut(p, dynamicColliders.cats);
    if (bumped && input.target && Math.hypot(input.target.x - p.x, input.target.z - p.z) < 1.5) input.target = null;
    playerShared.x = p.x;
    playerShared.z = p.z;
    playerShared.rot = rot.current;

    if (followCamera) {
      if (talking && view.talk) {
        // Close-up: frame player + NPC, look at midpoint between them
        const nx = view.talk.x;
        const nz = view.talk.z;
        const midX = (p.x + nx) / 2;
        const midZ = (p.z + nz) / 2;
        const dx = nx - p.x;
        const dz = nz - p.z;
        const len = Math.hypot(dx, dz) || 1;
        let sideX = -dz / len;
        let sideZ = dx / len;
        // Prefer the side closer to current follow yaw (less whip)
        if (sideX * Math.sin(view.yaw) + sideZ * Math.cos(view.yaw) < 0) {
          sideX = -sideX;
          sideZ = -sideZ;
        }
        const dist = aspect < 1 ? 5.8 : 5.2;
        const height = aspect < 1 ? 3.6 : 3.2;
        camPos.set(midX + sideX * dist, height, midZ + sideZ * dist);
        camTarget.set(midX, 1.15, midZ);
        camera.position.lerp(camPos, 1 - Math.exp(-dt * 5));
        camera.lookAt(camTarget);
        // Face each other
        rot.current = Math.atan2(dx, dz);
      } else {
        // Third-person follow — yaw only from Q/R / look pad
        const back = aspect < 1 ? 11 : 8.5;
        const up = aspect < 1 ? 15 : 12;
        const ys = Math.sin(view.yaw);
        const yc = Math.cos(view.yaw);
        camPos.set(p.x + ys * back, up, p.z + yc * back);
        camera.position.copy(camPos);
        camTarget.set(p.x - ys * 1.5, 1, p.z - yc * 1.5);
        camera.lookAt(camTarget);
      }
    }

    if (ring.current) ring.current.position.set(p.x, 0.04, p.z);
    if (guide.current) {
      const wp = getWaypoint();
      const next = currentWalkTarget();
      const goal = next ?? wp ?? fallbackGoal;
      const final = wp ?? fallbackGoal;
      const dx = goal.x - p.x;
      const dz = goal.z - p.z;
      const dist = Math.hypot(final.x - p.x, final.z - p.z);
      const user = getUserWaypoint();
      if (user && dist < 2.2) {
        clearUserWaypoint();
        clearWalkRoute();
      }
      const far = dist > 6;
      guide.current.visible = far;
      if (far) {
        const a = Math.atan2(dx, dz);
        guide.current.position.set(p.x + Math.sin(a) * 1.25, 0.05, p.z + Math.cos(a) * 1.25);
        guide.current.rotation.y = a;
      }
    }

    // Which door are we standing at?
    const hit = zones.find(({ spot }) => Math.abs(p.x - spot.x) < 2.6 && Math.abs(p.z - spot.z) < 1.8);
    const id = hit?.b.id ?? null;
    if (id !== zone.current) {
      zone.current = id;
      onZone(hit?.b ?? null);
    }
  });

  // Wear whatever outfit was picked in Anne Maju
  const [look] = useState<Look>(() => ({ ...PLAYER_LOOK, ...currentOutfit().look }));

  const getPose = useMemo(
    () => (): Pose => {
      const now = Date.now();
      const drawing = now < playerShared.phoneDrawUntil;
      const phoneProgress = drawing ? 1 - (playerShared.phoneDrawUntil - now) / PHONE_DRAW_MS : 1;
      return {
        x: pos.current.x,
        z: pos.current.z,
        rotY: rot.current,
        walking: moving.current && !drawing && !playerShared.phoneHeld,
        seated: false,
        crouch: now < playerShared.crouchUntil && !drawing && !playerShared.phoneHeld,
        phone: drawing ? "draw" : playerShared.phoneHeld ? "hold" : undefined,
        phoneProgress,
      };
    },
    [],
  );

  return (
    <>
      <Person look={look} getPose={getPose} />
      {/* Ground ring so you can always spot yourself */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 32]} />
        <meshBasicMaterial color="#fcd34d" toneMapped={false} />
      </mesh>
      {/* Flat arrow on the ground pointing towards the restaurant */}
      <group ref={guide}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 0.6, 3]} />
          <meshBasicMaterial color="#fcd34d" toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
