"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Look } from "@/shared/three/look";
import { currentOutfit } from "@/games/anne-maju/progress";
import { sfx } from "@/shared/audio";
import { Person, type Pose } from "@/shared/three/person";
import { type Circle, dynamicColliders, staticColliders } from "./colliders";
import { input, moveVector, view } from "./controls";
import { player as playerShared } from "./traffic";
import { type Building, BOUNDS, BUILDINGS, doorSpot, footprint } from "./world-data";

const SPEED = 6;
const RADIUS = 0.45;
const PLAYER_LOOK: Look = { skin: "#c98d60", shirt: "#fcd34d", pants: "#2a2a33", headwear: "short", hair: "#2b2018" };

// Solid footprints, slightly inflated so the player doesn't clip into walls
const solids = BUILDINGS.map((b) => {
  const f = footprint(b);
  return { minX: f.minX - RADIUS, maxX: f.maxX + RADIUS, minZ: f.minZ - RADIUS, maxZ: f.maxZ + RADIUS };
});
const blocked = (x: number, z: number) => solids.some((s) => x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ);

// Push the player out of any overlapping circle; returns true if something was in the way
function pushOut(p: THREE.Vector3, list: Circle[]) {
  let hit = false;
  for (const c of list) {
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

// Door zones for buildings you can walk into (or that are coming soon)
const zones = BUILDINGS.filter((b) => b.game || b.soon).map((b) => ({ b, spot: doorSpot(b) }));
// The guide arrow points at the first playable building until you're nearly there
const goal = doorSpot(BUILDINGS.find((b) => b.game)!);

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
  // Camera yaw: 0 looks north (at the north-side shops), PI looks south when you're on the south sidewalk
  const initialYaw = spawn.z > 3 ? Math.PI : 0;
  const yaw = useRef(initialYaw);
  const yawTarget = useRef(initialYaw);
  const ring = useRef<THREE.Mesh>(null);
  const guide = useRef<THREE.Group>(null);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const aspect = useThree((s) => s.size.width / s.size.height);

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = pos.current;

    view.cutaway = active && followCamera;
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

    // Joystick/keys win over tap-to-walk; input is relative to where the camera is facing
    const mv = moveVector();
    const cy = Math.cos(yaw.current);
    const sy = Math.sin(yaw.current);
    let vx = mv.x * cy - mv.y * sy;
    let vz = -mv.x * sy - mv.y * cy;
    if (vx === 0 && vz === 0 && input.target) {
      const dx = input.target.x - p.x;
      const dz = input.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.25) input.target = null;
      else {
        vx = dx / d;
        vz = dz / d;
      }
    }
    moving.current = vx !== 0 || vz !== 0;
    // Walking off cancels a petting crouch
    if (moving.current) playerShared.crouchUntil = 0;
    if (moving.current) {
      const nx = THREE.MathUtils.clamp(p.x + vx * SPEED * dt, -BOUNDS, BOUNDS);
      const nz = THREE.MathUtils.clamp(p.z + vz * SPEED * dt, -BOUNDS, BOUNDS);
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
      if (input.target && blocked(nx, nz)) input.target = null;
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

    // Swing the camera round to face whichever row of shops you're walking along (with hysteresis)
    if (p.z > 3.4) yawTarget.current = Math.PI;
    else if (p.z < 2.6) yawTarget.current = 0;
    yaw.current += (yawTarget.current - yaw.current) * (1 - Math.exp(-dt * 3));

    // Third-person follow camera, steep enough that near-side buildings rarely get in the way
    const back = aspect < 1 ? 11 : 8.5;
    const up = aspect < 1 ? 15 : 12;
    if (followCamera) {
      const ys = Math.sin(yaw.current);
      const yc = Math.cos(yaw.current);
      camPos.set(p.x + ys * back, up, p.z + yc * back);
      camera.position.lerp(camPos, 1 - Math.exp(-dt * 5));
      camTarget.set(p.x - ys * 1.5, 1, p.z - yc * 1.5);
      camera.lookAt(camTarget);
    }

    if (ring.current) ring.current.position.set(p.x, 0.04, p.z);
    if (guide.current) {
      const dx = goal.x - p.x;
      const dz = goal.z - p.z;
      const far = Math.hypot(dx, dz) > 6;
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
    () => (): Pose => ({
      x: pos.current.x,
      z: pos.current.z,
      rotY: rot.current,
      walking: moving.current,
      seated: false,
      crouch: Date.now() < playerShared.crouchUntil,
    }),
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
