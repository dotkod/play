"use client";

import { useEffect } from "react";
import { emit } from "@/core/events";
import { savePosition, setFlag } from "@/core/profile";
import type { RailLine, RailStation } from "@/content/transit/rail";
import { requestTeleport } from "@/world/player-bridge";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";
import { TransitCabinView } from "./transit-cabin";

const RIDE_MS = 3000;

export function RailRideOverlay({
  line,
  to,
  onDone,
}: {
  line: RailLine;
  to: RailStation;
  onDone: () => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];

  useEffect(() => {
    const a = setTimeout(() => {
      requestTeleport(to.exitX, to.exitZ, to.exitRotY);
      emit({ type: "entered", place: to.place });
      setFlag(`discovered:${to.place}`, true);
      if (line.id === "lrt") emit({ type: "tookLrt", to: to.id });
      else if (line.id === "mrt") emit({ type: "tookMrt", to: to.id });
      else emit({ type: "tookMonorel", to: to.id });
      savePosition(to.district, to.exitX, to.exitZ);
    }, RIDE_MS * 0.4);
    const b = setTimeout(() => onDone(), RIDE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to.id, line.id]);

  return (
    <TransitCabinView
      kind="rail"
      accent={line.color}
      title={tr.railRiding}
      subtitle={`${line.name[lang]} → ${to.label[lang]}`}
    />
  );
}
