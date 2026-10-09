"use client";

import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";
import type { Building } from "./world-data";

/** Lightweight indoor overlay — real 3D rooms come later; this lets every shop feel enterable. */
export function InteriorOverlay({ building, onLeave }: { building: Building; onLeave: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const emoji = building.game?.emoji ?? building.interior?.emoji ?? "🏪";
  const title = building.game?.title ?? building.interior?.title ?? building.sign;
  const blurb = building.interior
    ? lang === "ms"
      ? building.interior.blurbMs
      : building.interior.blurbEn
    : tr.insideDefault;

  return (
    <div className="fixed inset-0 z-[35] flex flex-col bg-[#2a2420] select-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${building.color} 0%, transparent 55%), linear-gradient(180deg, #3d342e 0%, #1f1a17 100%)`,
        }}
      />
      <div className="relative z-10 m-auto flex w-[min(420px,92%)] flex-col items-center gap-4 rounded-3xl border-4 border-ink bg-cream px-6 py-8 text-center shadow-[0_12px_0_#1f1a17]">
        <span className="text-5xl">{emoji}</span>
        <p className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">{tr.inside}</p>
        <h2 className="text-2xl font-extrabold leading-tight text-ink">{title}</h2>
        <p className="text-sm font-bold text-ink/70">{blurb}</p>
        <button
          type="button"
          onClick={onLeave}
          className="mt-2 w-full rounded-2xl bg-amber-300 py-3.5 text-lg font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
        >
          {tr.leave}
        </button>
      </div>
    </div>
  );
}
