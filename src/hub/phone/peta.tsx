"use client";

import { getProfile, useProfile } from "@/core/profile";
import { RAIL_LINES, type RailLine, type RailStation } from "@/content/transit";
import { TAXI_DESTS, TAXI_FARE_SEN, TAXI_UNLOCK_FLAG, type TaxiDest } from "@/content/transit/taxi";
import { useLang } from "@/shared/lang";
import { rm } from "../hud";
import { HUB_STRINGS } from "../strings";

export function Peta({
  onOpenMap,
  onRail,
  onTaxi,
}: {
  onOpenMap: () => void;
  onRail: (line: RailLine, dest: RailStation) => void;
  onTaxi: (dest: TaxiDest) => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  useProfile();
  const flags = getProfile().flags;
  const taxiOk = !!flags[TAXI_UNLOCK_FLAG];

  const discovered = RAIL_LINES.flatMap((line) =>
    line.stations
      .filter((s) => flags[`discovered:${s.place}`])
      .map((station) => ({ line, station })),
  );

  return (
    <div className="bg-[#f2f2f7] px-3 pb-8">
      <p className="px-2 pt-1 pb-1 text-[34px] leading-none font-bold tracking-tight text-black">{tr.petaTitle}</p>
      <p className="mb-4 px-2 text-[13px] text-[#8e8e93]">{tr.petaHint}</p>

      <button
        type="button"
        onClick={onOpenMap}
        className="mb-4 w-full rounded-[14px] bg-white px-4 py-3.5 text-left text-[17px] font-semibold text-[#007aff] shadow-sm active:bg-black/5"
      >
        🗺️ {tr.petaOpenMap}
      </button>

      <p className="mb-1.5 px-4 text-[13px] tracking-wide text-[#8e8e93] uppercase">{tr.petaStations}</p>
      <div className="mb-5 overflow-hidden rounded-[14px] bg-white shadow-sm">
        {discovered.length === 0 ? (
          <p className="px-4 py-4 text-[15px] text-[#8e8e93]">{tr.petaNeedDiscover}</p>
        ) : (
          discovered.map(({ line, station }, i) => (
            <button
              key={`${line.id}-${station.id}`}
              type="button"
              onClick={() => onRail(line, station)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-black/5 ${i > 0 ? "border-t border-black/5" : ""}`}
            >
              <span className="text-xl">{line.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold text-black">{station.label[lang]}</span>
                <span className="block text-[13px] text-[#8e8e93]">
                  {line.name[lang]} · {rm(line.fareSen)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <p className="mb-1.5 px-4 text-[13px] tracking-wide text-[#8e8e93] uppercase">{tr.petaTaxi}</p>
      <div className="overflow-hidden rounded-[14px] bg-white shadow-sm">
        {!taxiOk ? (
          <p className="px-4 py-4 text-[15px] text-[#8e8e93]">{tr.taxiLocked}</p>
        ) : (
          TAXI_DESTS.map((dest, i) => (
            <button
              key={dest.id}
              type="button"
              onClick={() => onTaxi(dest)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-black/5 ${i > 0 ? "border-t border-black/5" : ""}`}
            >
              <span className="text-xl">🚕</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold text-black">{dest.label[lang]}</span>
                <span className="block text-[13px] text-[#8e8e93]">
                  {tr.taxiTitle} · {rm(TAXI_FARE_SEN)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
