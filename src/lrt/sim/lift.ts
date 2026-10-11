/**
 * Per-station lift cabin (street ↔ deck). Pure sim — read from useFrame / ride-session.
 */

import { PLATFORM_Y } from "../plan/constants";
import { STATIONS } from "../plan/stations";

export type LiftState = {
  /** Cabin floor height. */
  y: number;
  from: number;
  to: number;
  /** 0..1 travel progress while moving. */
  t: number;
  moving: boolean;
  /** 0 closed … 1 open. */
  door: number;
};

const RIDE_S = 2.4;

function makeIdle(y: number): LiftState {
  return { y, from: y, to: y, t: 1, moving: false, door: 1 };
}

export const liftByStation: Record<string, LiftState> = Object.fromEntries(
  STATIONS.map((st) => [st.id, makeIdle(0)]),
);

export function cabinY(stationId: string) {
  return liftByStation[stationId]?.y ?? 0;
}

export function callLift(stationId: string, toY: number) {
  const L = liftByStation[stationId];
  if (!L || L.moving) return;
  if (Math.abs(L.y - toY) < 0.08) return;
  L.from = L.y;
  L.to = toY;
  L.t = 0;
  L.moving = true;
}

/** Call the opposite floor from wherever the cabin is. */
export function callLiftToggle(stationId: string) {
  const L = liftByStation[stationId];
  if (!L || L.moving) return;
  callLift(stationId, L.y < PLATFORM_Y * 0.5 ? PLATFORM_Y : 0);
}

export function tickLifts(dt: number) {
  for (const st of STATIONS) {
    const L = liftByStation[st.id]!;
    if (L.moving) {
      L.door = Math.max(0, L.door - dt * 4);
      if (L.door > 0.08) continue;
      L.t = Math.min(1, L.t + dt / RIDE_S);
      const u = L.t * L.t * (3 - 2 * L.t);
      L.y = L.from + (L.to - L.from) * u;
      if (L.t >= 1) {
        L.y = L.to;
        L.moving = false;
        L.from = L.to;
      }
    } else {
      L.door = Math.min(1, L.door + dt * 2.8);
    }
  }
}

export function resetLifts() {
  for (const st of STATIONS) {
    liftByStation[st.id] = makeIdle(0);
  }
}
