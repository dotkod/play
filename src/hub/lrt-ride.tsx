"use client";

import { useEffect, useState } from "react";
import { emit } from "@/core/events";
import { savePosition } from "@/core/profile";
import { lrtStationById, type LrtStationId } from "@/content/transit/lrt-kelana";
import { requestTeleport } from "@/world/player-bridge";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";

const RIDE_MS = 2800;

export function LrtRideOverlay({ to, onDone }: { to: LrtStationId; onDone: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const dest = lrtStationById(to);
  const [phase, setPhase] = useState<"wait" | "ride">("wait");

  useEffect(() => {
    const a = setTimeout(() => {
      setPhase("ride");
      requestTeleport(dest.exitX, dest.exitZ, dest.exitRotY);
      emit({ type: "entered", place: dest.place });
      emit({ type: "tookLrt", to });
      savePosition(dest.district, dest.exitX, dest.exitZ);
    }, RIDE_MS * 0.4);
    const b = setTimeout(() => onDone(), RIDE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a2438] text-cream">
      <div className={`transition-opacity duration-500 ${phase === "wait" ? "opacity-100" : "opacity-90"}`}>
        <p className="text-4xl">🚇</p>
        <p className="mt-3 text-lg font-extrabold">{phase === "wait" ? tr.lrtArriving : tr.lrtRiding}</p>
        <p className="mt-1 text-sm font-bold text-cream/70">{dest.label[lang]}</p>
        <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-cream/20">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[#c62f25]" />
        </div>
      </div>
    </div>
  );
}
