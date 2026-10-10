"use client";

/** The bar on screen during a shift: time left, takings, streak, and pause / skip. */

import type { RefObject } from "react";
import { useT } from "../i18n";
import { type GameState, timeLeft } from "../state";
import { CountUp } from "./bits";
import { Btn, Chip, IconBtn } from "./kit";

export function ShiftHud({
  s,
  moneyRef,
  onPause,
  onSkipTutorial,
}: {
  s: GameState;
  moneyRef: RefObject<HTMLSpanElement | null>;
  onPause: () => void;
  onSkipTutorial: () => void;
}) {
  const tr = useT();
  const secs = Math.ceil(timeLeft(s) / 1000);
  const tutorial = s.phase === "tutorial";
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-2xl border-[3px] border-ink bg-cream px-1.5 py-1 shadow-[0_4px_0_#1f1a17]">
        {tutorial ? (
          <Chip icon="🎓">{tr.practice}</Chip>
        ) : (
          <Chip icon="⏱" tone={secs <= 10 ? "warn" : "plain"}>
            {secs}s
          </Chip>
        )}
        {s.mode === "daily" && <Chip icon="📅">{""}</Chip>}
        <span className="h-5 w-0.5 rounded bg-ink/15" />
        <Chip
          icon="🪙"
          innerRef={(el) => {
            moneyRef.current = el;
          }}
        >
          <CountUp sen={s.earned} />
        </Chip>
        <span className="h-5 w-0.5 rounded bg-ink/15" />
        <Chip icon="🔥" tone={s.streak >= 3 ? "hot" : "plain"}>
          {s.streak}
        </Chip>
      </div>
      {s.phase === "playing" && (
        <IconBtn label={tr.pause} onClick={onPause}>
          ⏸
        </IconBtn>
      )}
      {tutorial && (
        <Btn tone="cream" size="sm" onClick={onSkipTutorial}>
          {tr.skipTutorial} ⏭
        </Btn>
      )}
    </div>
  );
}
