/**
 * One shuttle on the elevated sandbox line: dwell with doors open, cruise, reverse at ends.
 * Mutable module singleton — read from useFrame, never from React render.
 */

import { rideBusy } from "../components/fare";
import { APPROACH_SPEED, CRUISE_SPEED, DECK_Y, DOOR_HALF, DWELL_S, PLAT_EDGE_Z, PLATFORM_ALONG, TRAIN_LEN, TRAIN_WIDTH } from "../plan/constants";
import { PATH_LENGTH, samplePath, stationS } from "../plan/path";
import { STATIONS, inRect, rect } from "../plan/stations";
import { trainDoorGap, trainFootprint, type BoxCollider } from "../plan/colliders";

export type ShuttlePhase = "dwell" | "cruise";

export type ShuttleState = {
  s: number;
  /** +1 eastbound, -1 westbound. */
  dir: 1 | -1;
  speed: number;
  phase: ShuttlePhase;
  dwellLeft: number;
  doorsOpen: boolean;
  /** Index of the stop we are at or heading toward. */
  targetIndex: number;
  x: number;
  z: number;
  rotY: number;
  y: number;
  /** Station id we last departed from (for tookLrt). */
  lastStopId: string | null;
  /** Station id we are currently dwelling at. */
  atStopId: string | null;
};

function stopIndexForS(s: number) {
  let best = 0;
  let bestD = Infinity;
  for (const st of STATIONS) {
    const d = Math.abs(st.s - s);
    if (d < bestD) {
      bestD = d;
      best = st.index;
    }
  }
  return best;
}

function makeInitial(): ShuttleState {
  const pusat = STATIONS[1]!;
  const sample = samplePath(pusat.s);
  return {
    s: pusat.s,
    dir: 1,
    speed: 0,
    phase: "dwell",
    dwellLeft: DWELL_S,
    doorsOpen: true,
    targetIndex: 2,
    x: sample.x,
    z: sample.z,
    rotY: Math.PI / 2,
    y: DECK_Y,
    lastStopId: null,
    atStopId: pusat.id,
  };
}

let shuttle: ShuttleState | null = null;

export function getShuttle() {
  shuttle ??= makeInitial();
  return shuttle;
}

export function resetShuttle() {
  shuttle = makeInitial();
  return shuttle;
}

function applySample(st: ShuttleState) {
  const sample = samplePath(st.s);
  st.x = sample.x;
  st.z = sample.z;
  st.rotY = st.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  st.y = DECK_Y;
}

/** Advance the shuttle by dt seconds. */
export function tickShuttle(dt: number) {
  const st = getShuttle();
  const targetS = stationS(st.targetIndex);

  if (st.phase === "dwell") {
    st.speed = 0;
    st.doorsOpen = true;
    // Hold doors while the player is walking to a seat or out of the car
    if (!rideBusy()) st.dwellLeft -= dt;
    if (st.dwellLeft <= 0) {
      st.phase = "cruise";
      st.doorsOpen = false;
      st.lastStopId = st.atStopId;
      st.atStopId = null;
      // Pick next stop in current direction; reverse at ends
      let next = st.targetIndex;
      if (st.dir > 0) {
        if (stopIndexForS(st.s) >= STATIONS.length - 1) {
          st.dir = -1;
          next = STATIONS.length - 2;
        } else next = stopIndexForS(st.s) + 1;
      } else {
        if (stopIndexForS(st.s) <= 0) {
          st.dir = 1;
          next = 1;
        } else next = stopIndexForS(st.s) - 1;
      }
      st.targetIndex = next;
    }
    applySample(st);
    return st;
  }

  // Cruise toward target
  const dist = Math.abs(targetS - st.s);
  const approaching = dist < 28;
  const maxSpeed = approaching ? APPROACH_SPEED : CRUISE_SPEED;
  st.speed = Math.min(maxSpeed, st.speed + 8 * dt);
  if (approaching) st.speed = Math.min(st.speed, APPROACH_SPEED);
  st.doorsOpen = false;

  const step = st.speed * dt * st.dir;
  st.s = Math.max(0, Math.min(PATH_LENGTH, st.s + step));

  // Arrived?
  if ((st.dir > 0 && st.s >= targetS) || (st.dir < 0 && st.s <= targetS) || dist < 0.35) {
    st.s = targetS;
    st.speed = 0;
    st.phase = "dwell";
    st.dwellLeft = DWELL_S;
    st.doorsOpen = true;
    st.atStopId = STATIONS[st.targetIndex]!.id;
  }

  applySample(st);
  return st;
}

export function trainInteriorRect() {
  const st = getShuttle();
  const foot = trainFootprint(st.x, st.z);
  // Inset walls, but keep the south door lip so boarding can latch near the threshold
  return {
    minX: foot.minX + 0.35,
    maxX: foot.maxX - 0.35,
    minZ: foot.minZ + 0.25,
    maxZ: foot.maxZ + 0.15,
  };
}

export function playerInTrain(x: number, z: number) {
  return inRect(x, z, trainInteriorRect());
}

export function playerInDoorGap(x: number, z: number) {
  const st = getShuttle();
  return st.doorsOpen && inRect(x, z, trainDoorGap(st.x, st.z));
}

/** Moving colliders for the train: body walls, with south door open when dwelling. */
export function trainColliders() {
  const st = getShuttle();
  const foot = trainFootprint(st.x, st.z);
  const boxes = [
    // North wall
    { id: "train-n", rect: { minX: foot.minX, maxX: foot.maxX, minZ: foot.minZ, maxZ: foot.minZ + 0.2 } },
    // West / east cab ends
    { id: "train-w", rect: { minX: foot.minX, maxX: foot.minX + 0.25, minZ: foot.minZ, maxZ: foot.maxZ } },
    { id: "train-e", rect: { minX: foot.maxX - 0.25, maxX: foot.maxX, minZ: foot.minZ, maxZ: foot.maxZ } },
  ];
  if (st.doorsOpen) {
    // South wall with door gap
    boxes.push({ id: "train-s-w", rect: { minX: foot.minX, maxX: st.x - DOOR_HALF, minZ: foot.maxZ - 0.2, maxZ: foot.maxZ } });
    boxes.push({ id: "train-s-e", rect: { minX: st.x + DOOR_HALF, maxX: foot.maxX, minZ: foot.maxZ - 0.2, maxZ: foot.maxZ } });
  } else {
    boxes.push({ id: "train-s", rect: { minX: foot.minX, maxX: foot.maxX, minZ: foot.maxZ - 0.2, maxZ: foot.maxZ } });
  }
  void TRAIN_LEN;
  void TRAIN_WIDTH;
  return boxes;
}

/** True when platform screen doors at this station should be open (train dwelling here). */
export function platformDoorsOpen(stationId: string) {
  const st = getShuttle();
  return st.doorsOpen && st.atStopId === stationId;
}

/**
 * Platform edge / screen-door colliders: solid along the track side, with a boarding
 * gap only while the train is at that station with doors open.
 */
export function platformEdgeColliders(): BoxCollider[] {
  const boxes: BoxCollider[] = [];
  const platZ0 = PLAT_EDGE_Z;
  const half = PLATFORM_ALONG / 2;
  for (const station of STATIONS) {
    const open = platformDoorsOpen(station.id);
    if (open) {
      boxes.push({
        id: `${station.id}-psd-w`,
        rect: rect(station.x - half, station.x - DOOR_HALF, platZ0 - 0.25, platZ0 + 0.15),
      });
      boxes.push({
        id: `${station.id}-psd-e`,
        rect: rect(station.x + DOOR_HALF, station.x + half, platZ0 - 0.25, platZ0 + 0.15),
      });
    } else {
      boxes.push({
        id: `${station.id}-psd`,
        rect: rect(station.x - half, station.x + half, platZ0 - 0.25, platZ0 + 0.15),
      });
    }
  }
  return boxes;
}
