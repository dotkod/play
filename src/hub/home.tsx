"use client";

import { useState } from "react";
import { useLang } from "@/shared/lang";
import { TAMAN_HOME, TAMAN_HOME_DOOR } from "@/world/districts/taman-ceria/meta";
import { HUB_STRINGS } from "./strings";
import type { Building } from "./world-data";

/** Enterable terrace — not in pusat BUILDINGS (wrong footprint math). Door via `homeDoorSpot`. */
export const HOME_BUILDING: Building = {
  id: TAMAN_HOME.id,
  kind: "shophouse",
  sign: "RUMAH KAK YATI",
  x: TAMAN_HOME.x,
  side: "north",
  w: 7,
  d: 8,
  h: 5.8,
  color: "#f4efe4",
  interior: {
    title: "Rumah Kak Yati",
    emoji: "🏠",
    blurbMs: "Sofa lusuh, kipas berputar. Bau kari semalam. Selamat datang pulang.",
    blurbEn: "Worn sofa, spinning fan. Yesterday's curry smell. Welcome home.",
  },
};

export function homeDoorSpot() {
  return { x: TAMAN_HOME_DOOR.x, z: TAMAN_HOME_DOOR.z, facing: 1 as const };
}

export function isHomeBuilding(b: Building | null | undefined) {
  return b?.id === HOME_BUILDING.id;
}

/** Warm indoor card with bed rest (realtime clock unchanged). */
export function HomeInterior({
  onLeave,
  onSleep,
}: {
  onLeave: () => void;
  onSleep: () => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const [resting, setResting] = useState(false);
  const info = HOME_BUILDING.interior!;

  const sleep = () => {
    if (resting) return;
    setResting(true);
    onSleep();
    window.setTimeout(() => setResting(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[35] flex flex-col bg-[#2a2420] select-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 50% 28%, #c4a574 0%, transparent 55%), linear-gradient(180deg, #4a3c32 0%, #1f1a17 100%)",
        }}
      />
      {resting && (
        <div className="pointer-events-none absolute inset-0 z-20 animate-pulse bg-[#1a1410]/85" aria-hidden />
      )}
      <div className="relative z-10 m-auto flex w-[min(420px,92%)] flex-col items-center gap-4 rounded-3xl border-4 border-ink bg-cream px-6 py-8 text-center shadow-[0_12px_0_#1f1a17]">
        <span className="text-5xl">{info.emoji}</span>
        <p className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">{tr.inside}</p>
        <h2 className="text-2xl font-extrabold leading-tight text-ink">{info.title}</h2>
        <p className="text-sm font-bold text-ink/70">{lang === "ms" ? info.blurbMs : info.blurbEn}</p>
        <div className="mt-1 flex w-full flex-col gap-2.5">
          <button
            type="button"
            disabled={resting}
            onClick={sleep}
            className="w-full rounded-2xl bg-sky-200 py-3.5 text-lg font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition enabled:active:translate-y-1 enabled:active:shadow-[0_2px_0_#1f1a17] disabled:opacity-60"
          >
            🛏 {tr.sleepBed}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="w-full rounded-2xl bg-amber-300 py-3.5 text-lg font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
          >
            {tr.leave}
          </button>
        </div>
      </div>
    </div>
  );
}
