/** Paid-zone + ride attach state for the sandbox (module singleton). */

import { STATIONS } from "../plan";
import { gateOpen } from "./gate-state";

/** Full scripted trip: gate → platform → seat → dest → exit gate. */
export type RidePhase =
  | "off"
  | "toPlatform"
  | "waitBoard"
  | "boardingWalk"
  | "seated"
  | "alightingWalk"
  | "toExit";

/** Sen by hop count on the 3-stop line (1 hop / 2 hops). */
export const FARE_SEN_1 = 120;
export const FARE_SEN_2 = 200;

export function fareSenBetween(fromId: string, toId: string): number {
  const a = STATIONS.findIndex((s) => s.id === fromId);
  const b = STATIONS.findIndex((s) => s.id === toId);
  if (a < 0 || b < 0 || a === b) return 0;
  return Math.abs(a - b) === 1 ? FARE_SEN_1 : FARE_SEN_2;
}

export function formatRm(sen: number) {
  return `RM${(sen / 100).toFixed(2)}`;
}

/** After wallet debit succeeds — open flap and start auto-walk to the platform. */
export function applyPaidTrip(fromId: string, destId: string) {
  fare.paid = true;
  fare.paidAt = fromId;
  fare.destId = destId;
  fare.ui = null;
  fare.pendingFrom = null;
  gateOpen[fromId] = true;
  fare.flapTimer = 60;
  fare.ridePhase = "toPlatform";
  fare.autoStep = 0;
  fare.riding = false;
}

export function cancelDestPick() {
  fare.ui = null;
  fare.pendingFrom = null;
}

export const fare = {
  /** Has tapped TnG this visit (can pass entry flaps / board). */
  paid: false,
  /** Station id where payment happened. */
  paidAt: null as string | null,
  /** Chosen destination station id. */
  destId: null as string | null,
  /** Seconds left to keep entry flap open after tap. */
  flapTimer: 0,
  /** True while attached to the moving train. */
  riding: false,
  ridePhase: "off" as RidePhase,
  /** Waypoint index for toPlatform / toExit. */
  autoStep: 0,
  rideLocalX: 0,
  rideLocalZ: 0,
  seatLocalX: 0,
  seatLocalZ: 0,
  seatLocalRot: 0,
  boardedAt: null as string | null,
  boardLock: 0,
  ui: null as null | "destPick",
  pendingFrom: null as string | null,
  prompt: null as null | "tng" | "wait" | "board" | "boarding" | "alighting" | "toPlatform" | "toExit" | "lift",
  toast: null as string | null,
};

export function resetFare() {
  fare.paid = false;
  fare.paidAt = null;
  fare.destId = null;
  fare.flapTimer = 0;
  fare.riding = false;
  fare.ridePhase = "off";
  fare.autoStep = 0;
  fare.rideLocalX = 0;
  fare.rideLocalZ = 0;
  fare.seatLocalX = 0;
  fare.seatLocalZ = 0;
  fare.seatLocalRot = 0;
  fare.boardedAt = null;
  fare.boardLock = 0;
  fare.ui = null;
  fare.pendingFrom = null;
  fare.prompt = null;
  fare.toast = null;
}

export function rideBusy() {
  return (
    fare.ridePhase === "toPlatform" ||
    fare.ridePhase === "waitBoard" ||
    fare.ridePhase === "boardingWalk" ||
    fare.ridePhase === "alightingWalk" ||
    fare.ridePhase === "toExit"
  );
}

export function groundScripted() {
  return fare.ridePhase === "toPlatform" || fare.ridePhase === "waitBoard" || fare.ridePhase === "toExit";
}
