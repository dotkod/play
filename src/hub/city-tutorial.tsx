"use client";

import { useState } from "react";
import { setFlag } from "@/core/profile";
import { useLang } from "@/shared/lang";
import { HUB_STRINGS } from "./strings";

export const CITY_TUTORIAL_FLAG = "city:tutorial-done";

const STEPS = ["welcome", "move", "look", "phone", "world"] as const;
type Step = (typeof STEPS)[number];

/** First-signup city tips — skippable, once per account via profile flag. */
export function CityTutorial({ username, onDone }: { username: string; onDone: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const [i, setI] = useState(0);
  const step: Step = STEPS[i] ?? "world";
  const last = i >= STEPS.length - 1;

  const body =
    step === "welcome"
      ? tr.tutWelcome(username)
      : step === "move"
        ? tr.tutMove
        : step === "look"
          ? tr.tutLook
          : step === "phone"
            ? tr.tutPhone
            : tr.tutWorld;

  const finish = () => {
    setFlag(CITY_TUTORIAL_FLAG, true);
    onDone();
  };

  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/45 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-0">
      <div className="w-full max-w-md animate-pop rounded-3xl border-4 border-ink bg-cream p-5 text-ink shadow-[0_10px_0_#1f1a17]">
        <p className="text-[11px] font-extrabold tracking-wider text-ink/50 uppercase">
          {tr.tutTitle} · {i + 1}/{STEPS.length}
        </p>
        <p className="mt-2 text-xl leading-snug font-extrabold sm:text-2xl">{body}</p>
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-1.5 flex-1 rounded-full ${idx <= i ? "bg-amber-300" : "bg-ink/15"}`} />
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={finish}
            className="rounded-2xl border-2 border-ink/20 px-4 py-3 text-sm font-extrabold text-ink/60 active:scale-95"
          >
            {tr.tutSkip}
          </button>
          <button
            type="button"
            onClick={() => {
              if (last) finish();
              else setI((n) => n + 1);
            }}
            className="flex-1 rounded-2xl border-[3px] border-ink bg-amber-300 py-3 text-lg font-extrabold shadow-[0_4px_0_#1f1a17] active:translate-y-1 active:shadow-[0_1px_0_#1f1a17]"
          >
            {last ? tr.tutStart : tr.tutNext}
          </button>
        </div>
      </div>
    </div>
  );
}
