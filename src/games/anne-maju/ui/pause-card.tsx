"use client";

/** Paused mid-shift: carry on, restart, or stop the shift and stay in the shop. */

import { setMuted, unlockAudio, useMuted } from "@/shared/audio";
import { setLang, useLang, useT } from "../i18n";
import { Version } from "./bits";
import { Btn, Card } from "./kit";

export function Overlay({ children }: { children: React.ReactNode }) {
  return <div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-ink/45 p-4 backdrop-blur-[2px]">{children}</div>;
}

export function PauseCard({ onResume, onRestart, onStop }: { onResume: () => void; onRestart: () => void; onStop: () => void }) {
  const tr = useT();
  const lang = useLang();
  const muted = useMuted();
  return (
    <Overlay>
      <Card className="flex w-full max-w-xs animate-pop flex-col gap-2.5 p-4 text-center">
        <p className="text-2xl font-extrabold">⏸ {tr.paused}</p>
        <Btn tone="amber" size="lg" onClick={onResume}>
          {tr.resume}
        </Btn>
        <div className="flex gap-2">
          <Btn tone="cream" size="sm" onClick={onRestart} className="flex-1">
            {tr.restart}
          </Btn>
          <Btn tone="chili" size="sm" onClick={onStop} className="flex-1">
            {tr.stopShift}
          </Btn>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink/5 px-3 py-2 text-sm font-bold">
          <span>{tr.language}</span>
          <div className="flex gap-1">
            {(["ms", "en"] as const).map((l) => (
              <Btn key={l} tone={lang === l ? "amber" : "ghost"} size="sm" onClick={() => setLang(l)} className="!px-2 !py-0.5 text-xs">
                {l === "ms" ? "BM" : "EN"}
              </Btn>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink/5 px-3 py-2 text-sm font-bold">
          <span>{tr.sound}</span>
          <Btn
            tone={muted ? "ghost" : "amber"}
            size="sm"
            className="!px-2 !py-0.5 text-xs"
            onClick={() => {
              unlockAudio();
              setMuted(!muted);
            }}
          >
            {muted ? "🔇" : "🔊"}
          </Btn>
        </div>
        <Version className="text-ink/40" />
      </Card>
    </Overlay>
  );
}
