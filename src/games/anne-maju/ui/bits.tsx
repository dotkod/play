"use client";

/** Small shared pieces of the Anne Maju UI. */

import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { GAME } from "../meta";
import { OUTFITS } from "../progress";
import { rm } from "../result";

export const titleStroke = "[-webkit-text-stroke:7px_#1f1a17] [paint-order:stroke_fill]";

/** Money ticks up instead of jumping. */
export function CountUp({ sen }: { sen: number }) {
  const [shown, setShown] = useState(sen);
  const from = useRef(sen);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 450);
      const v = Math.round(a + (sen - a) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [sen]);
  return <>{rm(shown)}</>;
}

export function Version({ className = "" }: { className?: string }) {
  const build = process.env.NEXT_PUBLIC_BUILD;
  return (
    <p className={`text-[11px] font-bold tabular-nums ${className}`}>
      v{GAME.version}
      {build ? ` · ${build}` : ""}
    </p>
  );
}

/** Outfits for Anne, unlocked by total earnings; locked ones show what they cost. */
export function OutfitPicker({
  careerSen,
  outfitId,
  onOutfit,
  light = false,
}: {
  careerSen: number;
  outfitId: string;
  onOutfit: (id: string) => void;
  /** On a cream card instead of the dark menu. */
  light?: boolean;
}) {
  const tr = useT();
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-extrabold ${light ? "text-ink/60" : "text-cream/80"}`}>{tr.outfitTitle}</span>
      {OUTFITS.map((o) => {
        const open = careerSen >= o.at;
        return (
          <button
            key={o.id}
            type="button"
            disabled={!open}
            onClick={() => onOutfit(o.id)}
            title={open ? o.id : rm(o.at)}
            className={`grid size-9 place-items-center rounded-xl text-lg transition ${
              o.id === outfitId ? "bg-amber-300 shadow-[0_3px_0_#1f1a17]" : open ? (light ? "bg-ink/8 active:scale-95" : "bg-cream/20 active:scale-95") : light ? "bg-ink/10 opacity-50" : "bg-ink/40 opacity-50"
            }`}
          >
            {open ? o.emoji : "🔒"}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream p-1.5 shadow-[0_3px_0_#1f1a17]">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-ink/50">{label}</p>
    </div>
  );
}
