"use client";

import type { RailLine, RailStation } from "@/content/transit/rail";
import { useLang } from "@/shared/lang";
import { rm } from "./hud";
import { HUB_STRINGS } from "./strings";

export function RailBoard({
  open,
  line,
  from,
  onClose,
  onPick,
}: {
  open: boolean;
  line: RailLine;
  from: string;
  onClose: () => void;
  onPick: (dest: RailStation) => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  if (!open) return null;
  const options = line.stations.filter((s) => s.id !== from);
  return (
    <div className="absolute inset-0 z-[45] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label={tr.close} onClick={onClose} />
      <div className="relative z-10 mb-4 w-[min(420px,94vw)] overflow-hidden rounded-3xl border-4 border-ink bg-cream shadow-[0_10px_0_#1f1a17]">
        <div className="border-b-4 border-ink px-4 py-3" style={{ backgroundColor: line.color }}>
          <p className="text-sm font-extrabold text-white">
            {line.emoji} {line.name[lang]}
          </p>
          <p className="text-[11px] font-bold text-white/85">
            {tr.railBoardHint} · {rm(line.fareSen)}
          </p>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {options.map((dest) => (
            <button
              key={dest.id}
              type="button"
              className="mb-1.5 flex w-full items-center gap-2 rounded-2xl border-2 border-ink bg-white px-3 py-2.5 text-left text-sm font-extrabold text-ink active:translate-y-0.5"
              onClick={() => onPick(dest)}
            >
              <span>{line.emoji}</span>
              <span>{dest.label[lang]}</span>
            </button>
          ))}
        </div>
        <button type="button" className="w-full border-t-4 border-ink bg-ink/5 px-4 py-2.5 text-sm font-extrabold" onClick={onClose}>
          {tr.close}
        </button>
      </div>
    </div>
  );
}
