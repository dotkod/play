"use client";

/**
 * The player in the v2 city: walks with keys or the joystick, collides with everything the
 * plan builds (walls, pillars, lamps, trees, furniture) and with moving cars and people,
 * and reports which door they're standing at. Also owns LRT fare / elevated walk when near
 * the Kelana line stations.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { currentOutfit } from "@/games/anne-maju/progress";
import { lookAxis, moveVector, view } from "@/hub/controls";
import { fare } from "@/lrt/components/fare";
import { gateOpen } from "@/lrt/components/gate-state";
import { localToWorldCam, tickRideSession, type RideRefs } from "@/lrt/components/ride-session";
import { coverTopAt, DECK_Y, SEAT_ROOT_Y } from "@/lrt/plan";
import { getShuttle } from "@/lrt/sim/shuttle";
import { sfx } from "@/shared/audio";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { atmosphere } from "@/world/atmosphere";
import { PHONE_DRAW_MS, player as shared, takeTeleport } from "@/world/player-bridge";
import { buildingHeight, BUILDINGS, type CityBuilding, COLLIDERS, GRID } from "../plan";
import { cityCamera } from "./camera-override";
import { cityDynamic } from "./dynamic";

const SPEED = 6;
const RADIUS = 0.45;
const LOOK: Look = { skin: "#c98d60", shirt: "#fcd34d", pants: "#2a2a33", headwear: "short", hair: "#2b2018" };

/** Enterable buildings (for now: the ones with a job inside). */
const DOORS = BUILDINGS.filter((b) => b.game).map((b) => ({ b }));

/** Roof boxes the camera must never sit inside (footprint grown a little, roof + parapet). */
const ROOFS = BUILDINGS.map((b) => ({ r: b.rect, top: buildingHeight(b) + 1.2 }));

/** Highest roof under (x, z), or 0. */
function roofAt(x: number, z: number) {
  let top = 0;
  for (const { r, top: t } of ROOFS) if (t > top && x > r.minX - 0.8 && x < r.maxX + 0.8 && z > r.minZ - 0.8 && z < r.maxZ + 0.8) top = t;
  return top;
}

/** Push a circle out of every box and circle it overlaps. */
function resolve(p: THREE.Vector3) {
  for (const c of COLLIDERS.boxes) {
    if (c.id.endsWith("-entry-flap")) {
      const stId = c.id.slice(0, -"-entry-flap".length);
      if (gateOpen[stId] || fare.paid) continue;
    }
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
  const body = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const hadShot = useRef(false);
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const rot = useRef(spawn.rotY);
  const moving = useRef(false);
  const seated = useRef(false);
  const stride = useRef({ dist: 0, alt: false });
  const zone = useRef<string | null>(null);
  const ring = useRef<THREE.Mesh>(null);
  const floorY = useRef(0);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const camHeight = useRef(11);
  const enterLatch = useRef(false);
  const walkStep = useRef(0);
  const sitLock = useRef(0);
  const B = GRID.bounds;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const p = pos.current;
    const persp = state.camera as THREE.PerspectiveCamera;
    const shuttle = getShuttle();

    const shot = cityCamera.shot;
    if (shot) {
      hadShot.current = true;
      if (body.current) body.current.visible = false;
      if (ring.current) ring.current.visible = false;
      const right = shot.panel.side === "right" ? shot.panel.px : 0;
      const bottom = shot.panel.side === "bottom" ? shot.panel.px : 0;
      const visW = Math.max(1, size.width - right);
      const visH = Math.max(1, size.height - bottom);
      const halfH = Math.atan(shot.fitHalfWidth / shot.fitDistance / (visW / visH));
      const fovVis = Math.max(42, (2 * halfH * 180) / Math.PI);
      const fov = (2 * Math.atan(Math.tan((fovVis * Math.PI) / 360) * (size.height / visH)) * 180) / Math.PI;
      if (Math.abs(persp.fov - fov) > 0.01) persp.fov += (fov - persp.fov) * Math.min(1, dt * 5);
      persp.setViewOffset(size.width, size.height, right / 2, bottom / 2, size.width, size.height);
      persp.updateProjectionMatrix();
      camPos.set(shot.pos.x, shot.pos.y, shot.pos.z);
      persp.position.lerp(camPos, 1 - Math.exp(-dt * 4));
      camTarget.lerp(new THREE.Vector3(shot.look.x, shot.look.y, shot.look.z), 1 - Math.exp(-dt * 4));
      persp.lookAt(camTarget);
      return;
    }
    if (hadShot.current) {
      hadShot.current = false;
      if (body.current) body.current.visible = true;
      if (ring.current) ring.current.visible = true;
      persp.fov = 50;
      persp.clearViewOffset();
      persp.updateProjectionMatrix();
    }
    const tp = takeTeleport();
    if (tp) {
      p.set(tp.x, 0, tp.z);
      rot.current = tp.rotY;
      floorY.current = 0;
      seated.current = false;
    }
    // Freeze only during the draw animation; walking while held puts the phone away (hub closes it)
    const drawing = Date.now() < shared.phoneDrawUntil;

    const refs: RideRefs = {
      p,
      rot,
      moving,
      seated,
      stride,
      floorY,
      walkStep,
      sitLock,
      enterLatch,
    };
    const mode = !drawing && active ? tickRideSession(refs, dt, active, false) : "off";

    if (mode === "off") {
      seated.current = false;
      floorY.current = 0;
      if (active && !drawing) {
        const turn = lookAxis();
        if (turn !== 0) view.yaw += turn * 2.2 * dt;
      }
      const mv = active && !drawing ? moveVector() : { x: 0, y: 0 };
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
    } else if (mode === "lrtFree") {
      // Stay inside city bounds while roaming station plazas
      p.x = THREE.MathUtils.clamp(p.x, B.minX + 1, B.maxX - 1);
      p.z = THREE.MathUtils.clamp(p.z, B.minZ + 1, B.maxZ - 1);
    }

    shared.x = p.x;
    shared.z = p.z;
    shared.rot = rot.current;

    if (lift.current) {
      lift.current.position.y = seated.current ? DECK_Y + SEAT_ROOT_Y : floorY.current;
    }
    if (ring.current) {
      ring.current.visible = mode === "off" || mode === "lrtFree";
      ring.current.position.set(p.x, floorY.current + 0.07, p.z);
    }

    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);

    if (mode === "riding") {
      const wantFov = fare.ridePhase === "seated" ? 72 : 58;
      if (Math.abs(persp.fov - wantFov) > 0.5) {
        persp.fov += (wantFov - persp.fov) * Math.min(1, dt * 6);
        persp.updateProjectionMatrix();
      }
      if (fare.ridePhase === "seated") {
        const yawOff = view.yaw - shuttle.rotY;
        const camLx = Math.sin(yawOff) * 0.35;
        const camLz = fare.seatLocalZ - 3.4;
        const wCam = localToWorldCam(camLx, camLz, shuttle.rotY, shuttle.x, shuttle.z);
        camera.position.set(wCam.x, DECK_Y + 2.15, wCam.z);
        const lookLx = fare.seatLocalX * 0.2 + Math.sin(yawOff) * 0.8;
        const lookLz = fare.seatLocalZ + 2.8 + Math.cos(yawOff) * 0.4;
        const lookW = localToWorldCam(lookLx, lookLz, shuttle.rotY, shuttle.x, shuttle.z);
        camTarget.set(lookW.x, DECK_Y + 1.75, lookW.z);
        camera.lookAt(camTarget);
        camHeight.current = DECK_Y + 2.15;
      } else {
        const back = 2.4;
        const rel = view.yaw - shuttle.rotY;
        const clx = fare.rideLocalX + Math.sin(rel) * back * 0.15;
        const clz = fare.rideLocalZ + Math.cos(rel) * back;
        const wCam = localToWorldCam(clx, clz, shuttle.rotY, shuttle.x, shuttle.z);
        camera.position.set(wCam.x, DECK_Y + 1.95, wCam.z);
        camTarget.set(p.x, DECK_Y + 1.35, p.z);
        camera.lookAt(camTarget);
        camHeight.current = DECK_Y + 1.95;
      }
    } else if (mode === "scripted" || mode === "lrtFree") {
      if (Math.abs(persp.fov - 50) > 0.5) {
        persp.fov += (50 - persp.fov) * Math.min(1, dt * 6);
        persp.updateProjectionMatrix();
      }
      const portrait = size.width < size.height;
      let back = portrait ? 11 : 8.5;
      let up = portrait ? 14 : 11;
      const cover = coverTopAt(p.x, p.z);
      if (cover > 0) {
        back = portrait ? 7 : 5.5;
        up = Math.max(up, cover - floorY.current + 2.2);
      }
      const seatX = p.x + sy * back;
      const seatZ = p.z + cy * back;
      const seatCover = coverTopAt(seatX, seatZ);
      if (seatCover > floorY.current + up - 0.5) up = seatCover - floorY.current + 1.8;
      camHeight.current += (floorY.current + up * (cover > 0 ? 1 : 0.85) - camHeight.current) * Math.min(1, dt * 6);
      camPos.set(seatX, camHeight.current, seatZ);
      camera.position.lerp(camPos, 1 - Math.exp(-dt * 6));
      camTarget.set(p.x - sy * 1.2, floorY.current + 1.6, p.z - cy * 1.2);
      camera.lookAt(camTarget);
    } else {
      if (Math.abs(persp.fov - 50) > 0.5) {
        persp.fov = 50;
        persp.updateProjectionMatrix();
      }
      const portrait = size.width < size.height;
      const back = portrait ? 11 : 8.5;
      const up = portrait ? 14 : 11;
      let k = 1;
      let y = up;
      const roof = roofAt(p.x + sy * back, p.z + cy * back);
      if (roof > y - 0.5) {
        if (roof + 1.5 <= up + 6) y = roof + 1.5;
        else while (k > 0.2 && roofAt(p.x + sy * back * k, p.z + cy * back * k) > y - 0.5) k -= 0.05;
      }
      camHeight.current += (y - camHeight.current) * Math.min(1, dt * 6);
      camPos.set(p.x + sy * back * k, camHeight.current, p.z + cy * back * k);
      camera.position.copy(camPos);
      camTarget.set(p.x - sy * 1.5, 2.2, p.z - cy * 1.5);
      camera.lookAt(camTarget);
    }

    // Door zone: only when freely walking the street (not mid-ride)
    if (mode === "off") {
      const hit = DOORS.find(({ b }) => {
        const along = b.facing === "n" || b.facing === "s";
        return Math.abs(p.x - b.door.x) < (along ? 2.4 : 1.8) && Math.abs(p.z - b.door.z) < (along ? 1.8 : 2.4);
      });
      const id = hit?.b.id ?? null;
      if (id !== zone.current) {
        zone.current = id;
        onZone(hit?.b ?? null);
      }
    } else if (zone.current !== null) {
      zone.current = null;
      onZone(null);
    }
  });

  const [look] = useState<Look>(() => ({ ...LOOK, ...currentOutfit().look }));
  const getPose = useMemo(
    () => (): Pose => {
      const now = Date.now();
      const drawing = now < shared.phoneDrawUntil;
      // Walking puts the phone away — no outstretched hold while moving
      const holding = shared.phoneHeld && !moving.current && !drawing;
      return {
        x: pos.current.x,
        z: pos.current.z,
        rotY: rot.current,
        walking: moving.current && !drawing && !holding && !seated.current,
        seated: seated.current,
        phone: drawing ? "draw" : holding ? "hold" : undefined,
        phoneProgress: drawing ? 1 - (shared.phoneDrawUntil - now) / PHONE_DRAW_MS : 1,
        masked: atmosphere.haze !== "none",
      };
    },
    [],
  );

  return (
    <>
      <group ref={lift}>
        <group ref={body}>
          <Person look={look} getPose={getPose} />
        </group>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 32]} />
        <meshBasicMaterial color="#fcd34d" toneMapped={false} />
      </mesh>
    </>
  );
}
