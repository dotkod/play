/**
 * Fixed Teksi Kumar destinations — all anchors come from the city / LRT plan.
 */

import { STATIONS } from "@/lrt/plan/stations";
import { BUILDINGS } from "../plan";

export type TaxiDest = {
  id: string;
  nameMs: string;
  nameEn: string;
  /** Sidewalk drop / pick point. */
  x: number;
  z: number;
};

/** Flat fare (sen) — matches hub `taxiFare` copy (RM3.50). */
export const TAXI_FARE_SEN = 350;

/** Destinations farther than this from the player stay on the list. */
export const TAXI_NEAR_M = 14;

export function taxiDestinations(): TaxiDest[] {
  const anne = BUILDINGS.find((b) => b.id === "anne-maju");
  const out: TaxiDest[] = [];
  if (anne) {
    out.push({
      id: "anne-maju",
      nameMs: "Anne Maju",
      nameEn: "Anne Maju",
      x: anne.door.x + 3,
      z: anne.rect.minZ - 2.6,
    });
  }
  for (const st of STATIONS) {
    out.push({
      id: `lrt-${st.id}`,
      nameMs: st.nameMs,
      nameEn: st.nameEn,
      x: st.x,
      z: st.street.maxZ - 0.45,
    });
  }
  return out;
}

export function taxiDestChoices(fromX: number, fromZ: number): TaxiDest[] {
  return taxiDestinations().filter((d) => Math.hypot(d.x - fromX, d.z - fromZ) >= TAXI_NEAR_M);
}

export function taxiDestById(id: string): TaxiDest | null {
  return taxiDestinations().find((d) => d.id === id) ?? null;
}
