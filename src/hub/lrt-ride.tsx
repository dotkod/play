"use client";

import { LRT_LINE } from "@/content/transit";
import { lrtStationById, type LrtStationId } from "@/content/transit/lrt-kelana";
import { RailRideOverlay } from "./rail-ride";

/** Thin LRT wrapper kept for any callers still using the old API. */
export function LrtRideOverlay({ to, onDone }: { to: LrtStationId; onDone: () => void }) {
  return <RailRideOverlay line={LRT_LINE} to={lrtStationById(to)} onDone={onDone} />;
}
