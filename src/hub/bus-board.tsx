"use client";

import { useSyncExternalStore } from "react";
import {
  BUS_FARE_SEN,
  BUS_ROUTES,
  etaLabel,
  etaMinutes,
  type BusDest,
} from "@/content/transit/bus-routes";
import { useLang } from "@/shared/lang";
import { busDestLabel } from "./bus-ride";
import { rm } from "./hud";
import { HUB_STRINGS } from "./strings";

function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 15_000);
  return () => clearInterval(id);
}
function nowMs() {
  return Date.now();
}

export function BusBoard({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (dest: BusDest) => void;
}) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  // Re-render ETAs every 15s without setState-in-effect
  useSyncExternalStore(subscribeMinute, nowMs, () => 0);
  if (!open) return null;
  const now = new Date();

  return (
    <div className="absolute inset-0 z-[45] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label={tr.close} onClick={onClose} />
      <div className="relative z-10 mb-4 w-[min(420px,94vw)] overflow-hidden rounded-3xl border-4 border-ink bg-cream shadow-[0_10px_0_#1f1a17]">
        <div className="border-b-4 border-ink bg-amber-300 px-4 py-3">
          <p className="text-sm font-extrabold text-ink">{tr.busBoardTitle}</p>
          <p className="text-[11px] font-bold text-ink/70">
            {tr.busBoardHint} · {rm(BUS_FARE_SEN)}
          </p>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {BUS_ROUTES.map((route) => {
            const eta = etaMinutes(route, now);
            return (
              <div key={route.id} className="mb-2">
                <div className="mb-1 flex items-center gap-2 px-1">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-extrabold text-white"
                    style={{ background: route.color }}
                  >
                    {route.id}
                  </span>
                  <span className="text-[11px] font-bold text-ink/70">{route.label[lang]}</span>
                  <span className="ml-auto text-[11px] font-extrabold text-ink">{etaLabel(eta, lang)}</span>
                </div>
                {route.stops.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    className="mb-1 flex w-full items-center gap-2 rounded-2xl border-2 border-ink bg-white px-3 py-2.5 text-left text-sm font-extrabold text-ink active:translate-y-0.5"
                    onClick={() => onPick(dest)}
                  >
                    <span>🚌</span>
                    <span className="flex-1">{busDestLabel(dest, tr)}</span>
                    <span className="text-[10px] font-bold text-ink/50">{route.id}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <button type="button" className="w-full border-t-4 border-ink bg-ink/5 px-4 py-2.5 text-sm font-extrabold" onClick={onClose}>
          {tr.close}
        </button>
      </div>
    </div>
  );
}
