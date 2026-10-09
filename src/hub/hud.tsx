"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/core/auth-client";
import { XP_PER_LEVEL, unreadInboxCount, useProfile } from "@/core/profile";
import { activeTaskSummary } from "@/core/tasks/engine";
import { gameClockLabel, presetForFrac, type LightPresetId } from "@/world/lighting";
import { Logo } from "@/shared/logo";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";

export const rm = (sen: number) => `RM${(sen / 100).toFixed(2)}`;

// Same ink outline trick as the LEPAK wordmark — yellow alone washes out on sunlit streets
const statNum =
  "font-extrabold tabular-nums text-amber-300 [paint-order:stroke_fill] [-webkit-text-stroke:4px_#1f1a17]";
const statSub = "font-extrabold text-cream [paint-order:stroke_fill] [-webkit-text-stroke:3px_#1f1a17]";

function periodLabel(id: LightPresetId, tr: (typeof HUB_STRINGS)["ms"]) {
  if (id === "pagi") return tr.periodPagi;
  if (id === "tengah") return tr.periodTengah;
  if (id === "petang") return tr.periodPetang;
  return tr.periodMalam;
}

/** Top-left: logo + clock + wallet on one row (no cards). */
export function WalletHud({ started }: { started: boolean }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const p = useProfile();
  const auth = useAuth();
  const [clock, setClock] = useState(() => gameClockLabel());
  const [period, setPeriod] = useState(() => presetForFrac().id);
  useEffect(() => {
    if (!started) return;
    const tick = () => {
      setClock(gameClockLabel());
      setPeriod(presetForFrac().id);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [started]);

  const into = p.xp % XP_PER_LEVEL;
  const pct = Math.min(100, (into / XP_PER_LEVEL) * 100);

  return (
    <div className="edge-tl pointer-events-none absolute z-20">
      <div className="flex items-end gap-3 sm:gap-4">
        <div
          className={`-rotate-3 drop-shadow-[0_3px_0_rgba(31,26,23,0.35)] transition-opacity duration-500 ${started ? "" : "opacity-0"}`}
        >
          <Logo size="hud" />
          {started && auth.username && (
            <p className={`mt-0.5 max-w-[9rem] truncate text-center text-[11px] sm:max-w-[11rem] sm:text-xs ${statSub}`}>
              @{auth.username}
            </p>
          )}
        </div>

        {started && (
          <div className="mb-0.5 flex items-end gap-3 sm:gap-4">
            <div className="leading-none">
              <p className={`text-lg sm:text-xl ${statNum}`}>{clock}</p>
              <p className={`mt-0.5 text-[10px] tracking-wide uppercase ${statSub}`}>{periodLabel(period, tr)}</p>
            </div>

            <span className="mb-1 hidden h-7 w-px bg-ink/50 sm:block" aria-hidden />

            <div className="leading-none">
              <p className={`text-lg sm:text-xl ${statNum}`}>{rm(p.wallet)}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`text-[10px] ${statSub}`}>{tr.level(p.level)}</span>
                <div className="h-1.5 w-10 overflow-hidden rounded-full bg-ink/55 ring-1 ring-ink/40 sm:w-14">
                  <div className="h-full rounded-full bg-amber-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Centered objective ribbon — sits below logo / minimap so it doesn’t crowd the corners. */
export function TaskBanner({ started }: { started: boolean }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  useProfile();
  if (!started) return null;
  const pinned = activeTaskSummary();
  if (!pinned) return null;
  const step = pinned.step + 1;
  const total = pinned.task.objectives.length;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-[5.5rem] sm:px-36"
      style={{ top: "max(5.75rem, calc(env(safe-area-inset-top) + 4.85rem))" }}
    >
      <div className="flex max-w-md min-w-0 items-stretch overflow-hidden rounded-2xl border-[3px] border-ink bg-cream/95 shadow-[0_4px_0_#1f1a17]">
        <div className="flex shrink-0 flex-col items-center justify-center bg-amber-300 px-2.5 py-1.5 text-ink">
          <span className="text-[9px] leading-none font-extrabold tracking-wider uppercase">{tr.appTugasan}</span>
          <span className="mt-0.5 text-[12px] leading-none font-extrabold tabular-nums">
            {step}/{total}
          </span>
        </div>
        <p className="min-w-0 flex-1 truncate px-3 py-2 text-[13px] leading-snug font-extrabold text-ink sm:text-[14px]">
          {pinned.task.title[lang]}
        </p>
      </div>
    </div>
  );
}

export function PhoneButton({ onOpen }: { onOpen: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  useProfile(); // re-render for unread badge
  const unread = unreadInboxCount();
  return (
    <button
      type="button"
      aria-label={tr.phone}
      onClick={onOpen}
      className="relative grid size-14 shrink-0 place-items-center rounded-2xl border-4 border-ink bg-cream text-2xl shadow-[0_4px_0_#1f1a17] active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
    >
      📱
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-chili px-1 text-[10px] font-extrabold text-white">{unread}</span>
      )}
    </button>
  );
}
