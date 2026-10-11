"use client";

/**
 * Sandbox walker: TnG → auto platform → board → sit → dest → auto exit.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { view } from "@/hub/controls";
import type { Look } from "@/shared/three/look";
import { Person, type Pose } from "@/shared/three/person";
import { player as shared } from "@/world/player-bridge";
import { coverTopAt, DECK_Y, SEAT_ROOT_Y } from "../plan";
import { getShuttle } from "../sim/shuttle";
import { fare } from "./fare";
import { localToWorldCam, tickRideSession, type RideRefs } from "./ride-session";

const LOOK: Look = { skin: "#c98d60", shirt: "#fcd34d", pants: "#2a2a33", headwear: "short", hair: "#2b2018" };

export function LrtPlayer({
  spawn,
  active,
  onToast,
}: {
  spawn: { x: number; z: number; rotY: number };
  active: boolean;
  onToast: (text: string) => void;
}) {
  const { size } = useThree();
  const body = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(spawn.x, 0, spawn.z));
  const rot = useRef(spawn.rotY);
  const moving = useRef(false);
  const seated = useRef(false);
  const stride = useRef({ dist: 0, alt: false });
  const floorY = useRef(0);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const camHeight = useRef(11);
  const enterLatch = useRef(false);
  const walkStep = useRef(0);
  const sitLock = useRef(0);
  const toastLatch = useRef<string | null>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const p = pos.current;
    const shuttle = getShuttle();
    const camera = state.camera as THREE.PerspectiveCamera;

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
    tickRideSession(refs, dt, active, true);

    if (fare.toast && fare.toast !== toastLatch.current) {
      toastLatch.current = fare.toast;
      onToast(fare.toast);
      fare.toast = null;
    }

    shared.x = p.x;
    shared.z = p.z;
    shared.rot = rot.current;

    if (lift.current) {
      lift.current.position.y = seated.current ? DECK_Y + SEAT_ROOT_Y : floorY.current;
    }

    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);

    if (fare.riding) {
      const wantFov = fare.ridePhase === "seated" ? 72 : 58;
      if (Math.abs(camera.fov - wantFov) > 0.5) {
        camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 6);
        camera.updateProjectionMatrix();
      }
      if (body.current) body.current.visible = true;

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
    } else {
      if (body.current) body.current.visible = true;
      if (Math.abs(camera.fov - 50) > 0.5) {
        camera.fov += (50 - camera.fov) * Math.min(1, dt * 6);
        camera.updateProjectionMatrix();
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
    }
  });

  const [look] = useState<Look>(() => LOOK);
  const getPose = useMemo(
    () => (): Pose => ({
      x: pos.current.x,
      z: pos.current.z,
      rotY: rot.current,
      walking: moving.current,
      seated: seated.current,
    }),
    [],
  );

  return (
    <group ref={lift}>
      <group ref={body}>
        <Person look={look} getPose={getPose} />
      </group>
    </group>
  );
}
