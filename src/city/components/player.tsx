"use client";

/**
 * The player in the v2 city: walks with keys or the joystick, collides with everything the
 * plan builds (walls, pillars, lamps, trees, furniture) and with moving cars and people,
 * and reports which door they're standing at.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { currentOutfit } from "@/games/anne-maju/progress";
import { lookAxis, moveVector, view } from "@/hub/controls";
import { sfx } from "@/shared/audio";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { PHONE_DRAW_MS, player as shared, takeTeleport } from "@/world/player-bridge";
import { BUILDINGS, type CityBuilding, COLLIDERS, GRID } from "../plan";
import { cityDynamic } from "./dynamic";

const SPEED = 6;
const RADIUS = 0.45;
const LOOK: Look = { skin: "#c98d60", shirt: "#fcd34d", pants: "#2a2a33", headwear: "short", hair: "#2b2018" };

/** Enterable buildings (for now: the ones with a job inside). */
const DOORS = BUILDINGS.filter((b) => b.game).map((b) => ({ b }));

/** Push a circle out of every box and circle it overlaps. */
function resolve(p: THREE.Vector3) {
  for (const c of COLLIDERS.boxes) {
    const r = c.rect;
    const nx = Math.max(r.minX, Math.min(p.x, r.maxX));
    const nz = Math.max(r.minZ, Math.min(p.z, r.maxZ));
    const dx = p.x - nx;
    const dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= RADIUS * RADIUS) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      p.x = nx + (dx / d) * RADIUS;
      p.z = nz + (dz / d) * RADIUS;
    } else {
      // Centre inside the box: leave by the nearest side
      const out = [p.x - r.minX, r.maxX - p.x, p.z - r.minZ, r.maxZ - p.z];
      const k = out.indexOf(Math.min(...out));
      if (k === 0) p.x = r.minX - RADIUS;
      else if (k === 1) p.x = r.maxX + RADIUS;
      else if (k === 2) p.z = r.minZ - RADIUS;
      else p.z = r.maxZ + RADIUS;
    }
  }
  const circles = [...COLLIDERS.circles, ...cityDynamic.vehicles, ...cityDynamic.people];
  for (const c of circles) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const min = c.r + RADIUS;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 < 1e-8) continue;
    const d = Math.sqrt(d2);
    p.x = c.x + (dx / d) * min;
    p.z = c.z + (dz / d) * min;
  }
}

export function CityPlayer({
  spawn,
  onZone,
  active,
}: {
  spawn: { x: number; z: number; rotY: number };
  onZone: (b: CityBuilding | null) => void;
  active: boolean;
}) {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const rot = useRef(spawn.rotY);
  const moving = useRef(false);
  const stride = useRef({ dist: 0, alt: false });
  const zone = useRef<string | null>(null);
  const ring = useRef<THREE.Mesh>(null);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const B = GRID.bounds;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const p = pos.current;
    const tp = takeTeleport();
    if (tp) {
      p.set(tp.x, 0, tp.z);
      rot.current = tp.rotY;
    }
    const onPhone = shared.phoneHeld || Date.now() < shared.phoneDrawUntil;
    if (active && !onPhone) {
      const turn = lookAxis();
      if (turn !== 0) view.yaw += turn * 2.2 * dt;
    }
    const mv = active && !onPhone ? moveVector() : { x: 0, y: 0 };
    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);
    const vx = mv.x * cy - mv.y * sy;
    const vz = -mv.x * sy - mv.y * cy;
    moving.current = vx !== 0 || vz !== 0;
    const ox = p.x;
    const oz = p.z;
    if (moving.current) {
      p.x = THREE.MathUtils.clamp(p.x + vx * SPEED * dt, B.minX + 1, B.maxX - 1);
      p.z = THREE.MathUtils.clamp(p.z + vz * SPEED * dt, B.minZ + 1, B.maxZ - 1);
      const want = Math.atan2(vx, vz);
      const diff = Math.atan2(Math.sin(want - rot.current), Math.cos(want - rot.current));
      rot.current += diff * Math.min(1, dt * 12);
    }
    resolve(p);
    stride.current.dist += Math.hypot(p.x - ox, p.z - oz);
    if (stride.current.dist > 1.1) {
      stride.current.dist = 0;
      stride.current.alt = !stride.current.alt;
      sfx.step(stride.current.alt);
    }
    shared.x = p.x;
    shared.z = p.z;
    shared.rot = rot.current;

    // Third-person follow; yaw only changes when the player turns the camera
    const portrait = size.width < size.height;
    const back = portrait ? 11 : 8.5;
    const up = portrait ? 14 : 11;
    camPos.set(p.x + sy * back, up, p.z + cy * back);
    camera.position.copy(camPos);
    camTarget.set(p.x - sy * 1.5, 2.2, p.z - cy * 1.5);
    camera.lookAt(camTarget);
    if (ring.current) ring.current.position.set(p.x, 0.07, p.z);

    // Door zone: standing in front of a shop door
    const hit = DOORS.find(({ b }) => {
      const along = b.facing === "n" || b.facing === "s";
      return Math.abs(p.x - b.door.x) < (along ? 2.4 : 1.8) && Math.abs(p.z - b.door.z) < (along ? 1.8 : 2.4);
    });
    const id = hit?.b.id ?? null;
    if (id !== zone.current) {
      zone.current = id;
      onZone(hit?.b ?? null);
    }
  });

  const [look] = useState<Look>(() => ({ ...LOOK, ...currentOutfit().look }));
  const getPose = useMemo(
    () => (): Pose => {
      const now = Date.now();
      const drawing = now < shared.phoneDrawUntil;
      return {
        x: pos.current.x,
        z: pos.current.z,
        rotY: rot.current,
        walking: moving.current && !drawing && !shared.phoneHeld,
        seated: false,
        phone: drawing ? "draw" : shared.phoneHeld ? "hold" : undefined,
        phoneProgress: drawing ? 1 - (shared.phoneDrawUntil - now) / PHONE_DRAW_MS : 1,
      };
    },
    [],
  );

  return (
    <>
      <Person look={look} getPose={getPose} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 32]} />
        <meshBasicMaterial color="#fcd34d" toneMapped={false} />
      </mesh>
    </>
  );
}
