"use client";

/**
 * Full-screen LRT sandbox preview. Opened from the hub when `?lrt=1`.
 * Live city is not mounted.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { addMoney, getProfile, setFlag } from "@/core/profile";
import { bindKeyboard, input } from "@/hub/controls";
import { WalletHud } from "@/hub/hud";
import { MuteButton } from "@/hub/ui/buttons";
import { Joystick, LookPad } from "@/hub/ui/sticks";
import { ambience, music, unlockAudio } from "@/shared/audio";
import { setLang, useLang } from "@/shared/lang";
import { LandscapeGate } from "@/shared/landscape-gate";
import { SPAWN, STATIONS } from "../plan";
import { LRT_STRINGS } from "../strings";
import { resetShuttle } from "../sim/shuttle";
import { LrtDestPicker } from "./dest-picker";
import { cancelDestPick, fare, formatRm, groundScripted, resetFare, rideBusy } from "./fare";
import { gateOpen } from "./gate-state";

const LrtWorld = dynamic(() => import("./world"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#9fdcd2] text-sm font-bold text-ink/60">…</div>,
});

const TOPUP_FLAG = "lrtSandboxTopup";

export function LrtSandbox() {
  const lang = useLang();
  const tr = LRT_STRINGS[lang];
  const [started, setStarted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [showDestPick, setShowDestPick] = useState(false);
  const [showMoveStick, setShowMoveStick] = useState(true);
  const [showLookPad, setShowLookPad] = useState(true);
  const toastSeq = useRef(1);

  useEffect(() => bindKeyboard(), []);

  useEffect(() => {
    resetShuttle();
    resetFare();
    for (const id of Object.keys(gateOpen)) gateOpen[id] = false;
    if (!getProfile().flags[TOPUP_FLAG]) {
      addMoney(500, "Sandbox LRT", "LRT sandbox");
      setFlag(TOPUP_FLAG, true);
    }
  }, []);

  useEffect(() => {
    const mq = matchMedia("(pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!started) return;
    unlockAudio();
    music.start("city");
    ambience.start();
    return () => {
      music.stop();
      ambience.stop();
    };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setShowDestPick(fare.ui === "destPick");
      const p = fare.prompt;
      if (fare.ui === "destPick") setPrompt(null);
      else if (p === "toPlatform") setPrompt(tr.toPlatformHint);
      else if (p === "toExit") setPrompt(tr.toExitHint);
      else if (p === "boarding") setPrompt(tr.boardingHint);
      else if (p === "alighting") setPrompt(tr.alightingHint);
      else if (fare.riding && fare.ridePhase === "seated" && fare.destId) {
        const dest = STATIONS.find((s) => s.id === fare.destId);
        const name = dest ? (lang === "ms" ? dest.nameMs : dest.nameEn).replace(/^Stesen |^Station /i, "") : "";
        setPrompt(tr.cabinHint(name));
      } else if (p === "tng") setPrompt(tr.tngPrompt);
      else if (p === "wait") setPrompt(tr.waitTrain);
      else if (p === "board") setPrompt(tr.boardPrompt);
      else setPrompt(null);
      const scripted = rideBusy() || groundScripted() || fare.riding;
      setShowMoveStick(!scripted && fare.ui !== "destPick");
      setShowLookPad(fare.ridePhase === "seated" || (!scripted && fare.ui !== "destPick"));
    }, 120);
    return () => clearInterval(id);
  }, [started, tr, lang]);

  const flash = (text: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToast({ text, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2800);
  };

  const onToast = (kind: string) => {
    if (kind === "needMoney") flash(tr.needMoney);
    else if (kind.startsWith("paid:")) {
      const [, destId, senStr] = kind.split(":");
      const dest = STATIONS.find((s) => s.id === destId);
      const name = dest ? (lang === "ms" ? dest.nameMs : dest.nameEn).replace(/^Stesen |^Station /i, "") : destId!;
      flash(tr.paidOk(name, formatRm(Number(senStr))));
    } else {
      const st = STATIONS.find((s) => s.id === kind);
      if (st) flash(tr.arrived(lang === "ms" ? st.nameMs : st.nameEn));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (fare.ui === "destPick" && e.key === "Escape") {
        e.preventDefault();
        cancelDestPick();
        return;
      }
      if (!started && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        input.enter = false;
        unlockAudio();
        setStarted(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <LandscapeGate />
      <LrtWorld spawn={SPAWN} active={started} onToast={onToast} />

      <WalletHud started={started} />

      <div className="edge-tr pointer-events-none absolute z-20 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex gap-2">
          <MuteButton />
          <div className="flex h-9 items-center rounded-xl bg-ink/80 p-1 text-xs font-extrabold shadow-lg">
            {(["ms", "en"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`h-full rounded-lg px-2 ${lang === l ? "bg-amber-300 text-ink" : "text-cream/70"}`}>
                {l === "ms" ? "BM" : "EN"}
              </button>
            ))}
          </div>
        </div>
        <p className="pointer-events-none max-w-[14rem] rounded-xl bg-ink/75 px-2 py-1 text-right text-[10px] font-bold text-cream/90">{tr.sandboxBadge}</p>
      </div>

      {!started && (
        <div className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-ink/50" onClick={() => setStarted(true)}>
          <div className="max-w-md rounded-2xl border-4 border-ink bg-cream px-6 py-5 text-center text-ink shadow-[0_6px_0_#1f1a17]">
            <p className="text-xs font-extrabold tracking-wide text-[#c62f25] uppercase">{tr.lineName}</p>
            <h1 className="mt-1 text-2xl font-extrabold">{tr.title}</h1>
            <p className="mt-2 text-sm font-bold text-ink/80">{tr.blurb}</p>
            <button
              type="button"
              className="mt-4 rounded-2xl border-4 border-ink bg-amber-300 px-8 py-3 text-xl font-extrabold"
              onClick={(e) => {
                e.stopPropagation();
                unlockAudio();
                setStarted(true);
              }}
            >
              {tr.start}
            </button>
          </div>
        </div>
      )}

      {started && showDestPick && <LrtDestPicker onToast={onToast} />}

      {toast && (
        <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-28 z-[60] flex justify-center px-4">
          <p className="animate-pop rounded-2xl bg-[#ff5a7a] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">{toast.text}</p>
        </div>
      )}

      {started && prompt && !showDestPick && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-4">
          <p className="rounded-full bg-ink/80 px-4 py-1.5 text-sm font-extrabold text-amber-200">{prompt}</p>
        </div>
      )}

      {started && touch && showMoveStick && <Joystick />}
      {started && touch && showLookPad && <LookPad />}
    </div>
  );
}
