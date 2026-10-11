/**
 * Shared LRT ride / auto-walk / TnG tick (sandbox + live city).
 * Mutates `fare` and the caller's pos/rot refs; returns the active mode.
 */

import * as THREE from "three";
import { emit } from "@/core/events";
import { input, lookAxis, moveVector, view } from "@/hub/controls";
import { sfx } from "@/shared/audio";
import {
  BENCH_SEAT_X,
  DECK_Y,
  PATH_MAX_X,
  PATH_MIN_X,
  PLATFORM_Y,
  STATIC_COLLIDERS,
  STATIONS,
  floorYAt,
} from "../plan";
import { getShuttle, platformEdgeColliders, playerInDoorGap, playerInTrain, trainColliders } from "../sim/shuttle";
import { fare, groundScripted } from "./fare";
import { gateOpen } from "./gate-state";

const AUTO_SPEED = 4.2;
const RIDE_SPEED = 2.6;
const FREE_SPEED = 5.5;
const RADIUS = 0.45;
const SIT_LOCK_S = 0.8;

const PLAYER_SEAT = {
  lx: BENCH_SEAT_X,
  lz: 2.4,
  localRot: -Math.PI / 2,
};

export type RideMode = "riding" | "scripted" | "lrtFree" | "off";

export type RideRefs = {
  p: THREE.Vector3;
  rot: { current: number };
  moving: { current: boolean };
  seated: { current: boolean };
  stride: { current: { dist: number; alt: boolean } };
  floorY: { current: number };
  walkStep: { current: number };
  sitLock: { current: number };
  enterLatch: { current: boolean };
};

function resolveLrt(p: THREE.Vector3, skipFlaps: Set<string>, elevated: boolean) {
  const streetBoxes = STATIC_COLLIDERS.boxes.filter((c) => {
    if (skipFlaps.has(c.id)) return false;
    return !c.id.includes("-wall-") && !c.id.includes("-plat-") && !c.id.includes("-furn-") && !c.id.startsWith("guide-rail");
  });
  const use = elevated
    ? [...STATIC_COLLIDERS.boxes.filter((c) => !skipFlaps.has(c.id)), ...platformEdgeColliders(), ...trainColliders()]
    : streetBoxes;
  for (const c of use) {
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
}

function toPlatformSign(rotY: number) {
  return Math.sin(rotY) >= 0 ? -1 : 1;
}

function localToWorld(lx: number, lz: number, rotY: number, ox: number, oz: number) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return { x: ox + lx * c + lz * s, z: oz - lx * s + lz * c };
}

function stepLocal(tx: number, tz: number, dt: number, rot: { current: number }, shuttleRotY: number) {
  const dx = tx - fare.rideLocalX;
  const dz = tz - fare.rideLocalZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    fare.rideLocalX = tx;
    fare.rideLocalZ = tz;
    return true;
  }
  const step = Math.min(dist, RIDE_SPEED * dt);
  fare.rideLocalX += (dx / dist) * step;
  fare.rideLocalZ += (dz / dist) * step;
  const want = Math.atan2(dx, dz) + shuttleRotY;
  const diff = Math.atan2(Math.sin(want - rot.current), Math.cos(want - rot.current));
  rot.current += diff * Math.min(1, dt * 12);
  return false;
}

function stepWorld(p: THREE.Vector3, rot: { current: number }, tx: number, tz: number, dt: number) {
  const dx = tx - p.x;
  const dz = tz - p.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.14) {
    p.x = tx;
    p.z = tz;
    return true;
  }
  const step = Math.min(dist, AUTO_SPEED * dt);
  p.x += (dx / dist) * step;
  p.z += (dz / dist) * step;
  const want = Math.atan2(dx, dz);
  const diff = Math.atan2(Math.sin(want - rot.current), Math.cos(want - rot.current));
  rot.current += diff * Math.min(1, dt * 12);
  return false;
}

function beginBoard(p: THREE.Vector3, rot: { current: number }, shuttle: ReturnType<typeof getShuttle>) {
  fare.riding = true;
  fare.ridePhase = "boardingWalk";
  fare.seatLocalX = PLAYER_SEAT.lx;
  fare.seatLocalZ = PLAYER_SEAT.lz;
  fare.seatLocalRot = PLAYER_SEAT.localRot;
  const toPlat = toPlatformSign(shuttle.rotY);
  fare.rideLocalX = toPlat * 1.15;
  fare.rideLocalZ = 0;
  fare.boardedAt = shuttle.atStopId;
  fare.autoStep = 0;
  const w = localToWorld(fare.rideLocalX, fare.rideLocalZ, shuttle.rotY, shuttle.x, shuttle.z);
  p.x = w.x;
  p.z = w.z;
  rot.current = shuttle.rotY;
  view.yaw = shuttle.rotY;
  sfx.chime();
}

function skipFlaps() {
  const skip = new Set<string>();
  for (const st of STATIONS) {
    if (gateOpen[st.id] || fare.paid) skip.add(`${st.id}-entry-flap`);
  }
  return skip;
}

function nearLrtVolume(x: number, z: number) {
  for (const st of STATIONS) {
    if (
      x >= st.street.minX - 4 &&
      x <= st.street.maxX + 4 &&
      z >= Math.min(st.street.minZ, st.platform.minZ) - 6 &&
      z <= st.street.maxZ + 8
    ) {
      return true;
    }
  }
  return false;
}

/** Tick flaps / board lock every frame (even when city owns movement). */
export function tickFareTimers(dt: number) {
  if (fare.ridePhase === "toPlatform" || fare.ridePhase === "waitBoard") {
    if (fare.paidAt) gateOpen[fare.paidAt] = true;
  } else if (fare.flapTimer > 0) {
    fare.flapTimer -= dt;
    if (fare.flapTimer <= 0) {
      for (const id of Object.keys(gateOpen)) gateOpen[id] = false;
    }
  }
  if (fare.boardLock > 0) fare.boardLock -= dt;
}

/**
 * Run LRT riding / scripted ground / free walk near stations.
 * Returns `off` when the city player should own street movement.
 */
export function tickRideSession(ctx: RideRefs, dt: number, active: boolean, clampStreet = false): RideMode {
  const { p, rot, moving, seated, stride, floorY, walkStep, sitLock, enterLatch } = ctx;
  const shuttle = getShuttle();

  tickFareTimers(dt);

  if (fare.riding) {
    const turn = lookAxis();
    if (active && turn !== 0) view.yaw += turn * 2.2 * dt;
    const toPlat = toPlatformSign(shuttle.rotY);
    moving.current = false;
    seated.current = false;

    if (fare.ridePhase === "boardingWalk") {
      fare.prompt = "boarding";
      sitLock.current = SIT_LOCK_S;
      if (walkStep.current === 0) {
        if (stepLocal(0, fare.seatLocalZ, dt, rot, shuttle.rotY)) walkStep.current = 1;
        else moving.current = true;
      } else {
        if (stepLocal(fare.seatLocalX, fare.seatLocalZ, dt, rot, shuttle.rotY)) {
          fare.ridePhase = "seated";
          seated.current = true;
          sitLock.current = SIT_LOCK_S;
          rot.current = shuttle.rotY + fare.seatLocalRot;
          moving.current = false;
        } else moving.current = true;
      }
    } else if (fare.ridePhase === "seated") {
      seated.current = true;
      fare.rideLocalX = fare.seatLocalX;
      fare.rideLocalZ = fare.seatLocalZ;
      rot.current = shuttle.rotY + fare.seatLocalRot;
      if (sitLock.current > 0) sitLock.current -= dt;
      const atDest =
        sitLock.current <= 0 &&
        shuttle.doorsOpen &&
        shuttle.phase === "dwell" &&
        !!fare.destId &&
        shuttle.atStopId === fare.destId &&
        fare.boardedAt !== fare.destId;
      if (atDest) {
        fare.ridePhase = "alightingWalk";
        walkStep.current = 0;
        seated.current = false;
        fare.prompt = "alighting";
        sfx.chime();
      } else {
        fare.prompt = null;
      }
    } else if (fare.ridePhase === "alightingWalk") {
      fare.prompt = "alighting";
      if (walkStep.current === 0) {
        if (stepLocal(0, fare.seatLocalZ, dt, rot, shuttle.rotY)) walkStep.current = 1;
        else moving.current = true;
      } else if (walkStep.current === 1) {
        if (stepLocal(0, 0, dt, rot, shuttle.rotY)) walkStep.current = 2;
        else moving.current = true;
      } else {
        if (stepLocal(toPlat * 1.4, 0, dt, rot, shuttle.rotY)) {
          if (fare.boardedAt && shuttle.atStopId && fare.boardedAt !== shuttle.atStopId) {
            emit({ type: "tookLrt", to: shuttle.atStopId });
            fare.toast = shuttle.atStopId;
          }
          fare.riding = false;
          fare.ridePhase = "toExit";
          fare.autoStep = 0;
          fare.boardLock = 2.5;
          walkStep.current = 0;
          const stop = STATIONS.find((s) => s.id === shuttle.atStopId) ?? STATIONS.find((s) => s.id === fare.destId);
          if (stop) {
            p.x = THREE.MathUtils.clamp(shuttle.x, stop.platform.minX + 2, stop.platform.maxX - 2);
            p.z = stop.platform.minZ + 2.2;
          } else {
            const w = localToWorld(toPlat * 3.8, 0, shuttle.rotY, shuttle.x, shuttle.z);
            p.x = w.x;
            p.z = w.z;
          }
          fare.rideLocalX = 0;
          fare.rideLocalZ = 0;
          floorY.current = PLATFORM_Y;
          seated.current = false;
          moving.current = true;
        } else moving.current = true;
      }
    }

    if (fare.riding) {
      const w = localToWorld(fare.rideLocalX, fare.rideLocalZ, shuttle.rotY, shuttle.x, shuttle.z);
      p.x = w.x;
      p.z = w.z;
      floorY.current = DECK_Y;
    }

    if (moving.current) {
      stride.current.dist += RIDE_SPEED * dt;
      if (stride.current.dist > 1.1) {
        stride.current.dist = 0;
        stride.current.alt = !stride.current.alt;
        sfx.step(stride.current.alt);
      }
    }
    return "riding";
  }

  if (groundScripted()) {
    seated.current = false;
    moving.current = false;
    const turn = lookAxis();
    if (active && turn !== 0) view.yaw += turn * 2.2 * dt;

    const origin = STATIONS.find((s) => s.id === fare.paidAt);
    const dest = STATIONS.find((s) => s.id === fare.destId);
    const skip = skipFlaps();

    if (fare.ridePhase === "toPlatform" && origin) {
      fare.prompt = "toPlatform";
      const wps: [number, number][] = [
        [origin.entryGate.x, origin.entryGate.z - 0.15],
        [origin.x, origin.platform.maxZ - 0.8],
        [origin.x, origin.platform.minZ + 2.15],
      ];
      const wp = wps[Math.min(fare.autoStep, wps.length - 1)]!;
      const ox = p.x;
      const oz = p.z;
      if (stepWorld(p, rot, wp[0], wp[1], dt)) {
        fare.autoStep += 1;
        if (fare.autoStep >= wps.length) {
          fare.ridePhase = "waitBoard";
          fare.autoStep = 0;
        }
      } else moving.current = true;
      resolveLrt(p, skip, true);
      stride.current.dist += Math.hypot(p.x - ox, p.z - oz);
    } else if (fare.ridePhase === "waitBoard" && origin) {
      fare.prompt = shuttle.doorsOpen && shuttle.atStopId === origin.id ? "board" : "wait";
      const ox = p.x;
      const oz = p.z;
      if (fare.boardLock <= 0 && shuttle.doorsOpen && shuttle.atStopId === origin.id) {
        if (playerInDoorGap(p.x, p.z) || playerInTrain(p.x, p.z)) {
          walkStep.current = 0;
          sitLock.current = SIT_LOCK_S;
          beginBoard(p, rot, shuttle);
          moving.current = true;
        } else {
          if (!stepWorld(p, rot, shuttle.x, origin.platform.minZ + 0.35, dt)) moving.current = true;
          resolveLrt(p, skip, true);
          if (playerInDoorGap(p.x, p.z) || playerInTrain(p.x, p.z)) {
            walkStep.current = 0;
            sitLock.current = SIT_LOCK_S;
            beginBoard(p, rot, shuttle);
            moving.current = true;
          }
        }
      } else {
        if (!stepWorld(p, rot, origin.x, origin.platform.minZ + 2.15, dt)) moving.current = true;
        resolveLrt(p, skip, true);
      }
      stride.current.dist += Math.hypot(p.x - ox, p.z - oz);
    } else if (fare.ridePhase === "toExit" && dest) {
      fare.prompt = "toExit";
      const wps: [number, number][] = [
        [dest.x, dest.platform.maxZ - 0.6],
        [dest.exitGate.x, dest.exitGate.z],
        [dest.exitGate.x, dest.exitGate.z + 2.8],
      ];
      const wp = wps[Math.min(fare.autoStep, wps.length - 1)]!;
      const ox = p.x;
      const oz = p.z;
      if (stepWorld(p, rot, wp[0], wp[1], dt)) {
        fare.autoStep += 1;
        if (fare.autoStep >= wps.length) {
          fare.ridePhase = "off";
          fare.paid = false;
          fare.paidAt = null;
          fare.destId = null;
          fare.boardedAt = null;
          fare.autoStep = 0;
          fare.prompt = null;
          moving.current = false;
        }
      } else moving.current = true;
      resolveLrt(p, skip, true);
      stride.current.dist += Math.hypot(p.x - ox, p.z - oz);
    }

    if (moving.current && stride.current.dist > 1.1) {
      stride.current.dist = 0;
      stride.current.alt = !stride.current.alt;
      sfx.step(stride.current.alt);
    }
    floorY.current = floorYAt(p.x, p.z);
    return "scripted";
  }

  // Free walk on / near LRT volumes (sandbox always; city when in station footprint)
  if (!clampStreet && !nearLrtVolume(p.x, p.z) && floorYAt(p.x, p.z) < 0.5 && !fare.paid && fare.ui !== "destPick") {
    seated.current = false;
    return "off";
  }

  seated.current = false;
  const turn = lookAxis();
  if (active && turn !== 0) view.yaw += turn * 2.2 * dt;
  const mv = active ? moveVector() : { x: 0, y: 0 };
  const cy = Math.cos(view.yaw);
  const sy = Math.sin(view.yaw);
  const vx = mv.x * cy - mv.y * sy;
  const vz = -mv.x * sy - mv.y * cy;
  moving.current = vx !== 0 || vz !== 0;
  const ox = p.x;
  const oz = p.z;
  if (moving.current) {
    if (clampStreet) {
      p.x = THREE.MathUtils.clamp(p.x + vx * FREE_SPEED * dt, PATH_MIN_X - 20, PATH_MAX_X + 20);
      p.z = THREE.MathUtils.clamp(p.z + vz * FREE_SPEED * dt, -12, 40);
    } else {
      p.x += vx * FREE_SPEED * dt;
      p.z += vz * FREE_SPEED * dt;
    }
    const want = Math.atan2(vx, vz);
    const diff = Math.atan2(Math.sin(want - rot.current), Math.cos(want - rot.current));
    rot.current += diff * Math.min(1, dt * 12);
  }
  const fy = floorYAt(p.x, p.z);
  resolveLrt(p, skipFlaps(), fy > 0.5);
  stride.current.dist += Math.hypot(p.x - ox, p.z - oz);
  if (stride.current.dist > 1.1) {
    stride.current.dist = 0;
    stride.current.alt = !stride.current.alt;
    sfx.step(stride.current.alt);
  }
  floorY.current = fy;
  if (playerInTrain(p.x, p.z)) floorY.current = Math.max(floorY.current, DECK_Y);

  if (fare.ui === "destPick") {
    fare.prompt = null;
    if (!input.enter) enterLatch.current = false;
  } else {
    fare.prompt = null;
    let nearTng: (typeof STATIONS)[number] | null = null;
    for (const st of STATIONS) {
      const d = Math.hypot(p.x - st.tngSpot.x, p.z - st.tngSpot.z);
      if (d < st.tngSpot.r) {
        nearTng = st;
        break;
      }
    }
    if (nearTng && !fare.paid) {
      fare.prompt = "tng";
      const pressed = input.enter;
      if (pressed && !enterLatch.current) {
        enterLatch.current = true;
        fare.ui = "destPick";
        fare.pendingFrom = nearTng.id;
      }
      if (!pressed) enterLatch.current = false;
    } else {
      enterLatch.current = false;
    }
  }
  return "lrtFree";
}

export function localToWorldCam(lx: number, lz: number, rotY: number, ox: number, oz: number) {
  return localToWorld(lx, lz, rotY, ox, oz);
}
