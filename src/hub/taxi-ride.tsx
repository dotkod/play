"use client";

import { useEffect } from "react";
import { emit } from "@/core/events";
import { savePosition } from "@/core/profile";
import type { TaxiDest } from "@/content/transit/taxi";
import { requestTeleport } from "@/world/player-bridge";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";
import { TransitCabinView } from "./transit-cabin";

const RIDE_MS = 2600;
const TAXI_ACCENT = "#fcd34d";

export function TaxiRideOverlay({ dest, onDone }: { dest: TaxiDest; onDone: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];

  useEffect(() => {
    const a = setTimeout(() => {
      requestTeleport(dest.x, dest.z, dest.rotY);
      emit({ type: "entered", place: dest.district });
      emit({ type: "tookTaxi", to: dest.id });
      savePosition(dest.district, dest.x, dest.z);
    }, RIDE_MS * 0.35);
    const b = setTimeout(() => onDone(), RIDE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.id]);

  return (
    <TransitCabinView
      kind="taxi"
      accent={TAXI_ACCENT}
      title={tr.taxiRiding}
      subtitle={`${tr.taxiTitle} → ${dest.label[lang]}`}
    />
  );
}
