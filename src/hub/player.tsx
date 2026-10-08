"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { input, moveVector } from "./controls";
import { player as playerShared } from "./traffic";
import { type Building, BOUNDS, BUILDINGS, doorSpot, footprint } from "./world-data";

const SPEED = 6;
const RADIUS = 0.45;
const PLAYER_LOOK: Look = { skin: "#c98d60", shirt: "#fcd34d", pants: "#2a2a33", headwear: "cap", hair: "#d8352a" };

// Solid footprints, slightly inflated so the player doesn't clip into walls
const solids = BUILDINGS.map((b) => {
  const f = footprint(b);
  return { minX: f.minX - RADIUS, maxX: f.maxX + RADIUS, minZ: f.minZ - RADIUS, maxZ: f.maxZ + RADIUS };
});
const blocked = (x: number, z: number) => solids.some((s) => x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ);

// Door zones for buildings you can walk into (or that are coming soon)
const zones = BUILDINGS.filter((b) => b.game || b.soon).map((b) => ({ b, spot: doorSpot(b) }));
// The guide arrow points at the first playable building until you're nearly there
const goal = doorSpot(BUILDINGS.find((b) => b.game)!);

export function Player({ spawn, onZone }: { spawn: { x: number; z: number; rotY: number }; onZone: (b: Building | null) => void }) {
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const rot = useRef(spawn.rotY);
  const moving = useRef(false);
  const zone = useRef<string | null>(null);
  const ring = useRef<THREE.Mesh>(null);
  const guide = useRef<THREE.Group>(null);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const aspect = useThree((s) => s.size.width / s.size.height);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = pos.current;

    // Joystick/keys win over tap-to-walk; the camera never rotates, so screen-up is world -z
    const mv = moveVector();
    let vx = mv.x;
    let vz = -mv.y;
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
    if (moving.current) {
      const nx = THREE.MathUtils.clamp(p.x + vx * SPEED * dt, -BOUNDS, BOUNDS);
      const nz = THREE.MathUtils.clamp(p.z + vz * SPEED * dt, -BOUNDS, BOUNDS);
      // Slide along walls: try each axis separately
      if (!blocked(nx, p.z)) p.x = nx;
      if (!blocked(p.x, nz)) p.z = nz;
      if (input.target && blocked(nx, nz)) input.target = null;
      const want = Math.atan2(vx, vz);
      let diff = want - rot.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      rot.current += diff * Math.min(1, dt * 12);
    }
    playerShared.x = p.x;
    playerShared.z = p.z;

    // Third-person follow camera: higher and further back on tall screens
    // Steep angle so buildings on the near side of the street don't hide the player
    const back = aspect < 1 ? 11 : 8.5;
    const up = aspect < 1 ? 15 : 12;
    camPos.set(p.x, up, p.z + back);
    camera.position.lerp(camPos, 1 - Math.exp(-dt * 5));
    camTarget.set(p.x, 1, p.z - 1.5);
    camera.lookAt(camTarget);

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

  const getPose = useMemo(() => (): Pose => ({ x: pos.current.x, z: pos.current.z, rotY: rot.current, walking: moving.current, seated: false }), []);

  return (
    <>
      <Person look={PLAYER_LOOK} getPose={getPose} />
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
