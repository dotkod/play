/**
 * Project the shuttle forward (without mutating the live sim) so station PIDs can
 * show next / following arrival times.
 */

import { APPROACH_SPEED, CRUISE_SPEED, DWELL_S } from "../plan/constants";
import { PATH_LENGTH, stationS } from "../plan/path";
import { STATIONS } from "../plan/stations";
import { getShuttle, type ShuttleState } from "./shuttle";

type Snap = {
  s: number;
  dir: 1 | -1;
  speed: number;
  phase: "dwell" | "cruise";
  dwellLeft: number;
  targetIndex: number;
  atIndex: number | null;
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

/** Where the shuttle heads after leaving `atIndex` traveling `dir`. */
export function towardFrom(atIndex: number, dir: 1 | -1): number {
  if (dir > 0) {
    if (atIndex >= STATIONS.length - 1) return atIndex - 1;
    return atIndex + 1;
  }
  if (atIndex <= 0) return atIndex + 1;
  return atIndex - 1;
}

function snapshot(st: ShuttleState): Snap {
  return {
    s: st.s,
    dir: st.dir,
    speed: st.speed,
    phase: st.phase,
    dwellLeft: st.dwellLeft,
    targetIndex: st.targetIndex,
    atIndex: st.atStopId ? STATIONS.find((x) => x.id === st.atStopId)!.index : null,
  };
}

function pickNext(snap: Snap) {
  if (snap.dir > 0) {
    if (stopIndexForS(snap.s) >= STATIONS.length - 1) {
      snap.dir = -1;
      return STATIONS.length - 2;
    }
    return stopIndexForS(snap.s) + 1;
  }
  if (stopIndexForS(snap.s) <= 0) {
    snap.dir = 1;
    return 1;
  }
  return stopIndexForS(snap.s) - 1;
}

function step(snap: Snap, dt: number) {
  const targetS = stationS(snap.targetIndex);
  if (snap.phase === "dwell") {
    snap.speed = 0;
    snap.dwellLeft -= dt;
    if (snap.dwellLeft <= 0) {
      snap.phase = "cruise";
      snap.atIndex = null;
      snap.targetIndex = pickNext(snap);
    }
    return;
  }
  const dist = Math.abs(targetS - snap.s);
  const approaching = dist < 28;
  const maxSpeed = approaching ? APPROACH_SPEED : CRUISE_SPEED;
  snap.speed = Math.min(maxSpeed, snap.speed + 8 * dt);
  if (approaching) snap.speed = Math.min(snap.speed, APPROACH_SPEED);
  snap.s = Math.max(0, Math.min(PATH_LENGTH, snap.s + snap.speed * dt * snap.dir));
  if ((snap.dir > 0 && snap.s >= targetS) || (snap.dir < 0 && snap.s <= targetS) || dist < 0.35) {
    snap.s = targetS;
    snap.speed = 0;
    snap.phase = "dwell";
    snap.dwellLeft = DWELL_S;
    snap.atIndex = snap.targetIndex;
  }
}

export type ArrivalRow = {
  etaSec: number;
  towardIndex: number;
  here: boolean;
  boarding: boolean;
};

/** Next and following arrivals at `stationIndex` (up to 2). */
export function arrivalsAt(stationIndex: number): ArrivalRow[] {
  const live = getShuttle();
  const snap = snapshot(live);
  const out: ArrivalRow[] = [];
  const dt = 0.25;
  let t = 0;
  const maxT = 600;

  if (snap.atIndex === stationIndex && snap.phase === "dwell") {
    out.push({
      etaSec: 0,
      towardIndex: towardFrom(stationIndex, snap.dir),
      here: true,
      boarding: live.doorsOpen && live.atStopId === STATIONS[stationIndex]!.id,
    });
  }

  let dwellingHere = snap.atIndex === stationIndex && snap.phase === "dwell";
  while (t < maxT && out.length < 2) {
    const was = dwellingHere;
    step(snap, dt);
    t += dt;
    dwellingHere = snap.atIndex === stationIndex && snap.phase === "dwell";
    if (dwellingHere && !was) {
      out.push({
        etaSec: Math.max(0, Math.round(t)),
        towardIndex: towardFrom(stationIndex, snap.dir),
        here: false,
        boarding: false,
      });
    }
  }
  return out;
}

export function formatEta(sec: number, lang: "ms" | "en"): string {
  if (sec <= 5) return lang === "ms" ? "TIBA" : "DUE";
  if (sec < 60) return lang === "ms" ? `${sec} s` : `${sec}s`;
  const min = Math.max(1, Math.round(sec / 60));
  return `${min} min`;
}
