"use client";

/**
 * Touch n Lepak destination sheet — sandbox and live city.
 */

import { spendMoney } from "@/core/profile";
import { sfx } from "@/shared/audio";
import { useLang } from "@/shared/lang";
import { STATIONS } from "../plan";
import { LRT_STRINGS } from "../strings";
import { applyPaidTrip, cancelDestPick, fare, fareSenBetween, formatRm } from "./fare";

export function LrtDestPicker({ onToast }: { onToast: (kind: string) => void }) {
  const lang = useLang();
  const tr = LRT_STRINGS[lang];
  const fromId = fare.pendingFrom;
  if (!fromId || fare.ui !== "destPick") return null;
  const destChoices = STATIONS.filter((s) => s.id !== fromId);

  const confirmDest = (destId: string) => {
    const sen = fareSenBetween(fromId, destId);
    if (sen <= 0) return;
    const ok = spendMoney(sen, "LRT Touch n Lepak", "LRT Touch n Lepak");
    if (!ok) {
      onToast("needMoney");
      return;
    }
    applyPaidTrip(fromId, destId);
    sfx.chime();
    onToast(`paid:${destId}:${sen}`);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/55 px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-ink bg-cream p-5 text-ink shadow-[0_6px_0_#1f1a17]">
        <p className="text-xs font-extrabold tracking-wide text-[#c62f25] uppercase">{tr.lineName}</p>
        <h2 className="mt-1 text-xl font-extrabold">{tr.pickDestTitle}</h2>
        <p className="mt-1 text-sm font-bold text-ink/70">{tr.pickDestHint}</p>
        <div className="mt-4 flex flex-col gap-2">
          {destChoices.map((st) => {
            const sen = fareSenBetween(fromId, st.id);
            const name = lang === "ms" ? st.nameMs : st.nameEn;
            return (
              <button
                key={st.id}
                type="button"
                className="flex items-center justify-between rounded-xl border-4 border-ink bg-amber-300 px-4 py-3 text-left font-extrabold active:translate-y-0.5"
                onClick={() => confirmDest(st.id)}
              >
                <span>{name}</span>
                <span className="tabular-nums">{formatRm(sen)}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="mt-3 w-full rounded-xl border-2 border-ink/30 px-4 py-2 text-sm font-extrabold text-ink/70" onClick={() => cancelDestPick()}>
          {tr.pickDestCancel}
        </button>
      </div>
    </div>
  );
}
