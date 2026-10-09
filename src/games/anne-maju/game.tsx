"use client";

import { type ReactNode, type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/core/auth-client";
import { queueJobResult } from "@/core/job-handoff";
import { music, setMuted, sfx, unlockAudio, useMuted } from "@/shared/audio";
import { LandscapeGate, requestLandscape } from "@/shared/landscape-gate";
import { hashString, rand, seedRandom, unseedRandom } from "@/shared/rng";
import { shareResult, type ShareOutcome } from "@/shared/share";
import { ANNE_LOOK, type Look, randomParty } from "@/shared/three/look";
import { useBestScore } from "@/shared/use-best-score";
import { type Cup, type Drink, drinkName, FULL_MENU, isCupComplete, type Menu, randomDrink, randomLine, sameDrink } from "./drinks";
import { getLang, type Lang, setLang, t, useLang, useT } from "./i18n";
import { LeaderboardPanel, useBoard } from "./leaderboard-panel";
import { GAME } from "./meta";
import { addCareer, career, currentOutfit, dailyKey, markTutorialDone, menuFor, newUnlocks, nextUnlock, OUTFITS, setOutfit, tutorialDone, type Unlock } from "./progress";
import { encodeResult, nextRank, rankFor, rm } from "./result";
import {
  currentStep,
  difficulty,
  type GameState,
  initialState,
  isLive,
  type Lines,
  type Mode,
  partySize,
  reducer,
  SHIFT_MS,
  type Spawn,
  type Step,
  STEPS,
  timeLeft,
} from "./state";

// WebGL only exists in the browser
const MamakScene = dynamic(() => import("./scene/mamak-scene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink/50">{t().loading}</div>,
});
const DrinkStation = dynamic(() => import("./scene/station"), { ssr: false });
const DemoBackdrop = dynamic(() => import("./scene/demo-backdrop"), { ssr: false });

// The tutorial customer: one teh ais at the front-middle table
const TUTORIAL_ORDER: Drink = { temp: "ais", base: "teh", milk: "susu", sugar: "biasa" };
const TUTORIAL_TABLE = 4;

// Uses the (possibly seeded) game random source, so daily shifts pick the same tables for everyone
const pickIndex = (n: number) => Math.floor(rand() * n);

// Customer lines are picked at dispatch time in whatever language is active
function lines(): Lines {
  const tr = t(getLang());
  return {
    happy: randomLine(tr.happy),
    wrong: randomLine(tr.wrong),
    leave: randomLine(tr.leave),
    annoyed: tr.annoyedAsk,
    refused: tr.refusedAsk,
    explain: (want, got, fields) => tr.explain(fields.map((f) => tr.notThis(tr.fieldWords[want[f]], tr.fieldWords[got[f]]))),
  };
}

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
};

type ShiftResult = { before: number; after: number; unlocks: Unlock[]; outfits: string[] };

export function AnneMajuGame({
  challenge,
  onExit,
  embedded = false,
}: {
  challenge?: number;
  onExit?: () => void;
  /** Mounted inside the city hub — exit feels like leaving the shop, not a site. */
  embedded?: boolean;
}) {
  const [s, dispatch] = useReducer(reducer, initialState);
  const [serveEvent, setServeEvent] = useState<{ table: number; id: number } | null>(null);
  const [combo, setCombo] = useState<{ n: number; id: number } | null>(null);
  const [result, setResult] = useState<ShiftResult | null>(null);
  const [careerSen, setCareerSen] = useState(career);
  const [outfit, setOutfitState] = useState(currentOutfit);
  const lang = useLang();
  const tr = useT();
  const stateRef = useRef(s);
  const anchors = useRef<(HTMLDivElement | null)[]>([]);
  const moneyEl = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    stateRef.current = s;
  });

  const menu: Menu = s.mode === "daily" ? FULL_MENU : menuFor(careerSen);
  const anneLook = useMemo<Look>(() => ({ ...ANNE_LOOK, ...outfit.look }), [outfit]);

  // Shift ended: bank career unlocks, and stash a city payout for when you walk back
  const finishShift = useCallback((cur: GameState) => {
    const before = career();
    const after = addCareer(cur.earned);
    const outfits = OUTFITS.filter((o) => o.at > before && o.at <= after).map((o) => o.emoji);
    setResult({ before, after, unlocks: newUnlocks(before, after), outfits });
    setCareerSen(after);
    if (cur.phase !== "tutorial" && cur.earned > 0) {
      queueJobResult({ job: GAME.slug, earned: cur.earned, served: cur.served, mode: cur.mode });
    }
    unseedRandom();
  }, []);

  const live = isLive(s);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const cur = stateRef.current;
      const now = Date.now();
      if (cur.phase === "playing") {
        // Sound cues derived from what this tick is about to change
        const leftBefore = Math.ceil(timeLeft(cur) / 1000);
        const leftNow = Math.ceil(Math.max(0, SHIFT_MS - (now - cur.startAt)) / 1000);
        if (leftNow !== leftBefore && leftNow <= 10 && leftNow > 0) {
          sfx.tick();
          if (leftNow === 10) music.setTempo(132);
        }
        if (leftNow === 0 && leftBefore > 0) {
          sfx.over();
          music.setTempo(112);
          finishShift(cur);
        }
        if (cur.tables.some((p) => p && p.leaveAt <= now)) {
          sfx.walkout();
          vibrate([30, 40, 30]);
        }
      }
      let spawn: Spawn | null = null;
      const free = cur.tables.flatMap((p, i) => (p ? [] : [i]));
      if (cur.phase === "playing" && free.length && now >= cur.nextSpawnAt) {
        sfx.arrive();
        const d = difficulty(cur);
        const m = cur.mode === "daily" ? FULL_MENU : menuFor(career());
        spawn = {
          table: free[pickIndex(free.length)],
          guests: randomParty(partySize(d)).map((look) => ({ look, order: randomDrink(d, m), served: false })),
          seed: pickIndex(1000),
        };
      }
      dispatch({ type: "tick", now, spawn, lines: lines() });
    }, 100);
    return () => clearInterval(id);
  }, [live, finishShift]);

  // Leaving the tab or app pauses the shift instead of silently burning the clock
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && stateRef.current.phase === "playing") {
        dispatch({ type: "pause", now: Date.now() });
        music.stop();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  // Stable so the memoised 3D counter doesn't re-render on every game tick
  const onPick = useCallback((part: Step, value: string) => {
    pickSound(part, value);
    dispatch({ type: "pick", part, value });
  }, []);

  const startShift = (mode: Mode) => {
    requestLandscape();
    unlockAudio();
    // Daily shifts replay the same customers for everyone today
    if (mode === "daily") seedRandom(hashString(`anne-maju:${dailyKey()}`));
    else unseedRandom();
    setResult(null);
    sfx.start();
    music.start();
    music.setTempo(112);
    dispatch({ type: "start", now: Date.now(), mode });
  };

  const startTutorial = () => {
    requestLandscape();
    unlockAudio();
    unseedRandom();
    sfx.start();
    music.start();
    dispatch({
      type: "tutorial",
      now: Date.now(),
      spawn: { table: TUTORIAL_TABLE, guests: [{ look: randomParty(1)[0], order: TUTORIAL_ORDER, served: false }], seed: 0 },
    });
  };

  const play = (mode: Mode) => (mode === "normal" && !tutorialDone() ? startTutorial() : startShift(mode));

  const pause = () => {
    dispatch({ type: "pause", now: Date.now() });
    music.stop();
  };
  const resume = () => {
    dispatch({ type: "resume", now: Date.now() });
    music.start();
  };

  if (s.phase === "intro" || s.phase === "over") {
    return (
      <div className="fixed inset-0 z-40 overflow-hidden select-none">
        <DemoBackdrop anneLook={anneLook} />
        {s.phase === "intro" ? (
          <Intro
            challenge={challenge}
            careerSen={careerSen}
            outfitId={outfit.id}
            onOutfit={(id) => {
              setOutfit(id);
              setOutfitState(currentOutfit());
            }}
            onStart={() => play("normal")}
            onDaily={() => play("daily")}
          />
        ) : (
          <GameOver s={s} result={result} careerSen={careerSen} onRestart={() => startShift(s.mode)} />
        )}
        <div className="edge-tl absolute">
          <BackToPlay onExit={onExit} embedded={embedded} />
        </div>
        <div className="edge-tr absolute flex gap-2">
          <LangToggle />
          <MuteButton />
        </div>
        <LandscapeGate />
      </div>
    );
  }

  const onTable = (i: number) => {
    const p = s.tables[i];
    if (!p || s.now < p.seatedAt) return;
    const cup = s.cup;
    if (isCupComplete(cup)) {
      const correct = p.guests.some((g) => !g.served && sameDrink(cup, g.order));
      if (correct) {
        sfx.correct();
        vibrate(25);
        flyCoin(anchors.current[i], moneyEl.current);
        const n = s.streak + 1;
        if ([3, 5, 10, 15, 20].includes(n)) {
          const id = Date.now();
          setCombo({ n, id });
          setTimeout(() => setCombo((c) => (c?.id === id ? null : c)), 1400);
        }
      } else {
        sfx.wrong();
        vibrate([40, 60, 40]);
      }
      dispatch({ type: "serve", table: i, lines: lines() });
      setServeEvent({ table: i, id: (serveEvent?.id ?? 0) + 1 });
    } else if (s.now < p.revealUntil) {
      // Order still showing: tap it to note it on the slip
      sfx.tap();
      dispatch({ type: "pin", table: i });
    } else {
      sfx.tap();
      dispatch({ type: "askAgain", table: i, lines: lines() });
    }
  };

  // Tutorial guidance: what to tap next for the tutorial order
  const tutorial = s.phase === "tutorial";
  const step = currentStep(s.cup);
  const offTrack = tutorial && STEPS.some((k) => s.cup[k] && s.cup[k] !== TUTORIAL_ORDER[k]);
  const hintValue = tutorial && step && !offTrack ? TUTORIAL_ORDER[step] : null;

  return (
    <div className="fixed inset-0 z-40 flex overflow-hidden select-none max-[520px]:flex-col [@media(max-height:420px)]:flex-col">
      <div className="relative min-h-0 min-w-0 flex-1">
        <MamakScene
          s={s}
          cupReady={isCupComplete(s.cup)}
          serveEvent={serveEvent}
          onTable={onTable}
          anneLook={anneLook}
          pulseTable={tutorial && !step && !offTrack ? TUTORIAL_TABLE : null}
          anchorsOut={anchors}
        />
        <div className="edge-bl absolute flex items-center gap-2">
          <Hud s={s} moneyRef={moneyEl} />
          {s.phase === "playing" && (
            <button
              type="button"
              aria-label={tr.pause}
              onClick={pause}
              className="grid size-11 place-items-center rounded-xl bg-ink/90 text-lg text-cream shadow-lg active:scale-95"
            >
              ⏸
            </button>
          )}
          {tutorial && (
            <button
              type="button"
              onClick={() => {
                markTutorialDone();
                startShift("normal");
              }}
              className="rounded-xl bg-ink/80 px-3 py-2 text-xs font-extrabold text-cream shadow-lg active:scale-95"
            >
              {tr.skipTutorial} ⏭
            </button>
          )}
        </div>
        {combo && (
          <div key={combo.id} className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span className="animate-pop rounded-2xl bg-amber-300 px-5 py-2 text-2xl font-extrabold text-ink shadow-[0_5px_0_#1f1a17]">{tr.combo(combo.n)}</span>
          </div>
        )}
        {tutorial && (
          <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
            <p className="rounded-2xl bg-ink/85 px-4 py-2 text-center text-sm font-bold text-cream shadow-lg">
              <span className="text-amber-300">{tr.tutorialTitle}</span> {tr.tutorialIntro}
            </p>
          </div>
        )}
      </div>
      <div className="safe-pr flex h-full w-[min(380px,46vw)] shrink-0 flex-col bg-[#2f8f86] shadow-[-4px_0_20px_rgba(0,0,0,0.15)] max-[520px]:h-[min(42%,280px)] max-[520px]:w-full max-[520px]:shadow-[0_-4px_20px_rgba(0,0,0,0.15)] [@media(max-height:420px)]:h-[min(42%,260px)] [@media(max-height:420px)]:w-full">
        <StepRail
          cup={s.cup}
          onRewind={(part) => {
            sfx.tap();
            dispatch({ type: "rewind", part });
          }}
          onDiscard={() => {
            sfx.tap();
            dispatch({ type: "discard" });
          }}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <DrinkStation cup={s.cup} lang={lang} onPick={onPick} menu={menu} hint={hintValue} />
          {tutorial && (
            <p className="pointer-events-none absolute inset-x-2 top-2 rounded-xl bg-amber-300 px-3 py-1.5 text-center text-sm font-extrabold text-ink shadow-[0_3px_0_#1f1a17]">
              {offTrack ? tr.hintWrongCup : step ? tr.hintStep(tr.fieldWords[TUTORIAL_ORDER[step]], tr.labels[TUTORIAL_ORDER[step]]) : tr.hintServe}
            </p>
          )}
          <Slip s={s} />
          {s.cup.base && (
            <p className="pointer-events-none absolute inset-x-0 bottom-2 truncate px-3 text-center text-base font-extrabold text-white drop-shadow-[0_2px_0_#1f1a17]">
              {cupTitle(s.cup, lang)}
            </p>
          )}
        </div>
      </div>
      {s.phase === "paused" && <PauseMenu onResume={resume} onRestart={() => startShift(s.mode)} onExit={onExit} embedded={embedded} />}
      {s.phase === "tutorialDone" && (
        <Modal>
          <p className="text-3xl font-extrabold">{tr.tutorialDoneTitle}</p>
          <p className="text-sm font-bold text-ink/70">{tr.tutorialDoneBody}</p>
          <button
            type="button"
            onClick={() => {
              markTutorialDone();
              startShift("normal");
            }}
            className="rounded-2xl bg-amber-300 px-6 py-3 text-xl font-extrabold text-ink shadow-[0_5px_0_#1f1a17] active:translate-y-1"
          >
            {tr.startReal}
          </button>
        </Modal>
      )}
      <LandscapeGate />
    </div>
  );
}

// A coin flies from the table's bubble to the money counter, which then bumps
function flyCoin(from: HTMLElement | null | undefined, to: HTMLElement | null) {
  if (!from || !to) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const coin = document.createElement("div");
  coin.textContent = "🪙";
  coin.style.cssText = `position:fixed;left:${a.left + a.width / 2}px;top:${a.top}px;font-size:28px;z-index:60;pointer-events:none;`;
  document.body.appendChild(coin);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top - a.top;
  const anim = coin.animate(
    [
      { transform: "translate(-50%,0) scale(1)" },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), ${dy * 0.5 - 60}px) scale(1.3)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), ${dy}px) scale(0.6)`, opacity: 0.6 },
    ],
    { duration: 650, easing: "ease-in-out" },
  );
  anim.onfinish = () => {
    coin.remove();
    to.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 260 });
  };
}

function Hud({ s, moneyRef }: { s: GameState; moneyRef: RefObject<HTMLSpanElement | null> }) {
  const tr = useT();
  const secs = Math.ceil(timeLeft(s) / 1000);
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-ink/90 px-4 py-2 text-lg font-bold text-cream shadow-lg">
      {s.phase === "tutorial" ? (
        <span className="text-amber-300">🎓 {tr.practice}</span>
      ) : (
        <span className={secs <= 10 ? "animate-pulse text-chili" : ""}>⏱ {secs}s</span>
      )}
      {s.mode === "daily" && <span className="text-sm">📅</span>}
      <span ref={moneyRef} className="inline-block">
        <CountUp sen={s.earned} />
      </span>
      <span className={s.streak >= 3 ? "text-amber-300" : ""}>🔥 {s.streak}</span>
    </div>
  );
}

// Money ticks up instead of jumping
function CountUp({ sen }: { sen: number }) {
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

// The noted order, pinned on the counter until that table is done
function Slip({ s }: { s: GameState }) {
  const tr = useT();
  const lang = useLang();
  const p = s.slip ? s.tables[s.slip.table] : null;
  if (!s.slip || !p || p.id !== s.slip.partyId) {
    return s.phase === "playing" && s.served === 0 ? (
      <p className="pointer-events-none absolute inset-x-2 bottom-9 rounded-xl bg-ink/40 px-2 py-1 text-center text-xs font-bold text-cream">📝 {tr.slipHint}</p>
    ) : null;
  }
  return (
    <div className="pointer-events-none absolute bottom-9 left-2 max-w-[70%] -rotate-2 rounded-lg bg-[#fffbe8] px-3 py-2 text-ink shadow-[0_3px_0_#1f1a17]">
      <p className="text-[11px] font-extrabold tracking-wide text-chili uppercase">
        {tr.slip} · {tr.slipTable(s.slip.table + 1)}
      </p>
      {p.guests.map((g, i) => (
        <p key={i} className={`text-sm leading-tight font-bold ${g.served ? "text-ink/35 line-through" : ""}`}>
          {g.served ? "✓" : "•"} {drinkName(g.order, lang)}
        </p>
      ))}
    </div>
  );
}

function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/60 p-4 backdrop-blur-[2px]">
      <div className="flex w-full max-w-sm animate-pop flex-col items-center gap-3 rounded-3xl bg-cream p-5 text-center text-ink shadow-[0_6px_0_#1f1a17]">{children}</div>
    </div>
  );
}

function PauseMenu({
  onResume,
  onRestart,
  onExit,
  embedded,
}: {
  onResume: () => void;
  onRestart: () => void;
  onExit?: () => void;
  embedded?: boolean;
}) {
  const tr = useT();
  return (
    <Modal>
      <p className="text-3xl font-extrabold">⏸ {tr.paused}</p>
      <button
        type="button"
        onClick={onResume}
        className="w-full rounded-2xl bg-amber-300 py-3 text-xl font-extrabold shadow-[0_5px_0_#1f1a17] active:translate-y-1"
      >
        {tr.resume}
      </button>
      <button type="button" onClick={onRestart} className="w-full rounded-2xl bg-ink/10 py-2.5 font-extrabold active:scale-95">
        {tr.restart}
      </button>
      <div className="flex w-full items-center justify-between gap-2 text-sm font-bold">
        <span>{tr.language}</span>
        <LangToggle />
      </div>
      <div className="flex w-full items-center justify-between gap-2 text-sm font-bold">
        <span>{tr.sound}</span>
        <MuteButton />
      </div>
      <BackToPlay wide onExit={onExit} embedded={embedded} />
      <Version className="text-ink/40" />
    </Modal>
  );
}

function pickSound(part: Step, value: string) {
  if (part === "temp") sfx.clink();
  else if (part === "base" || (part === "milk" && value !== "o")) sfx.pour();
  else if (part === "sugar" && value !== "kosong") sfx.sugar();
  else sfx.tap();
}

function MuteButton() {
  const muted = useMuted();
  const tr = useT();
  return (
    <button
      type="button"
      aria-label={muted ? tr.unmute : tr.mute}
      onClick={(e) => {
        e.stopPropagation();
        unlockAudio();
        setMuted(!muted);
      }}
      className="grid size-9 place-items-center rounded-xl bg-ink/80 text-lg shadow-lg active:scale-95"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

// Embedded: walk out of the mamak (same session). Else: link home + spawn at the door.
function BackToPlay({ wide = false, onExit, embedded = false }: { wide?: boolean; onExit?: () => void; embedded?: boolean }) {
  const tr = useT();
  const leave = () => {
    music.stop();
    unseedRandom();
    if (onExit) {
      onExit();
      return;
    }
    try {
      sessionStorage.setItem("dotkod-play:spawn", GAME.slug);
    } catch {}
  };
  const label = embedded ? (wide ? tr.walkOutWide : tr.walkOut) : wide ? tr.quit : "← KUALA LEPAK";
  const cls = `flex h-9 items-center justify-center gap-1 rounded-xl bg-ink/80 px-3 text-sm font-extrabold text-amber-300 shadow-lg active:scale-95 ${wide ? "w-full" : ""}`;
  if (onExit || embedded) {
    return (
      <button type="button" onClick={leave} className={cls}>
        {label}
      </button>
    );
  }
  return (
    <Link href="/" onClick={leave} className={cls}>
      {label}
    </Link>
  );
}

function LangToggle() {
  const lang = useLang();
  return (
    <div className="flex h-9 items-center rounded-xl bg-ink/80 p-1 text-xs font-extrabold shadow-lg" role="group" aria-label="Language">
      {(["ms", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={(e) => {
            e.stopPropagation();
            setLang(l);
          }}
          className={`h-full rounded-lg px-2 ${lang === l ? "bg-amber-300 text-ink" : "text-cream/70"}`}
        >
          {l === "ms" ? "BM" : "EN"}
        </button>
      ))}
    </div>
  );
}

function cupTitle(cup: Cup, lang: Lang) {
  return drinkName({ milk: "o", sugar: "biasa", temp: "panas", base: "teh", ...cup }, lang);
}

const STEP_ICON: Record<Step, string> = { temp: "☕", base: "🫙", milk: "🥛", sugar: "🍬" };

// Four steps, always visible: done steps show the choice and can be tapped to redo
function StepRail({ cup, onRewind, onDiscard }: { cup: Cup; onRewind: (p: Step) => void; onDiscard: () => void }) {
  const tr = useT();
  const active = currentStep(cup);
  return (
    <div className="flex items-center gap-1 p-1.5">
      {STEPS.map((p, i) => {
        const value = cup[p];
        const isActive = p === active;
        return (
          <button
            key={p}
            type="button"
            disabled={!value}
            onClick={() => onRewind(p)}
            className={`flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-1 leading-none transition ${
              isActive ? "bg-amber-300 text-ink shadow-[0_3px_0_#1f1a17]" : value ? "bg-white text-ink active:scale-95" : "bg-white/15 text-white/60"
            }`}
          >
            <span className="text-xs font-bold opacity-70">
              {i + 1}. {tr.steps[p]}
            </span>
            <span className="mt-0.5 truncate text-sm font-extrabold">{value ? tr.values[value] : STEP_ICON[p]}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onDiscard}
        aria-label={tr.discard}
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-lg active:scale-95"
      >
        🗑️
      </button>
    </div>
  );
}

// "v1.5.1 · a1b2c3d" so players (and bug reports) can say exactly which build they're on
function Version({ className = "" }: { className?: string }) {
  const build = process.env.NEXT_PUBLIC_BUILD;
  return (
    <p className={`text-[11px] font-bold tabular-nums ${className}`}>
      v{GAME.version}
      {build ? ` · ${build}` : ""}
    </p>
  );
}

const titleStroke = "[-webkit-text-stroke:7px_#1f1a17] [paint-order:stroke_fill]";

function Intro({
  challenge,
  careerSen,
  outfitId,
  onOutfit,
  onStart,
  onDaily,
}: {
  challenge?: number;
  careerSen: number;
  outfitId: string;
  onOutfit: (id: string) => void;
  onStart: () => void;
  onDaily: () => void;
}) {
  const tr = useT();
  const lang = useLang();
  const auth = useAuth();
  const { best } = useBestScore(GAME.storageKey);
  const { board } = useBoard();
  const upcoming = nextUnlock(careerSen);
  return (
    <div className="absolute inset-0 safe-px flex items-start justify-between gap-6 overflow-y-auto bg-gradient-to-r from-ink/80 via-ink/35 to-transparent safe-pt pb-4">
      {/* my-auto centres when there's room but never pushes content up under the top buttons */}
      <div className="my-auto flex max-w-md flex-col gap-2.5 text-cream">
        <span className="w-fit rounded-full bg-chili px-3 py-1 text-xs font-extrabold tracking-wide uppercase">{tr.badge}</span>
        <h1 className={`text-[clamp(2.2rem,7vh,4.5rem)] leading-[0.95] font-extrabold text-amber-300 ${titleStroke}`}>{GAME.name}</h1>
        <p className="text-base font-semibold text-cream/90">{tr.tagline}</p>
        {challenge !== undefined && <p className="animate-pop rounded-2xl bg-chili px-4 py-2 font-bold">{tr.challenge(rm(challenge), rankFor(challenge, lang).title)}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onStart}
            className="flex-1 rounded-2xl bg-amber-300 py-3.5 text-2xl font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
          >
            {tr.start}
          </button>
          <button
            type="button"
            onClick={onDaily}
            title={tr.dailySub}
            className="rounded-2xl bg-cream px-4 text-base leading-tight font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
          >
            {tr.dailyStart}
          </button>
        </div>
        <OutfitPicker careerSen={careerSen} outfitId={outfitId} onOutfit={onOutfit} />
        {upcoming && (
          <p className="text-xs font-bold text-cream/75">
            🔒 {tr.nextUnlock(rm(upcoming.at - careerSen), tr.unlockNames[upcoming.key])}
          </p>
        )}
        <details className="rounded-2xl bg-cream/15 px-3 py-2 text-sm backdrop-blur">
          <summary className="cursor-pointer font-bold">{tr.howTo}</summary>
          <ul className="mt-2 space-y-1 text-xs text-cream/90">
            {tr.howToItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>📝 {tr.slipHint}</li>
          </ul>
        </details>
        {best > 0 && (
          <p className="text-sm font-bold text-cream/80">
            {tr.yourBest} {rm(best)}
          </p>
        )}
        <Version className="text-cream/50" />
      </div>
      <div className="mt-auto hidden w-64 shrink-0 sm:block lg:w-72">
        <LeaderboardPanel board={board} highlight={auth.username ?? undefined} compact />
      </div>
    </div>
  );
}

// Outfits for Anne, unlocked by total earnings; locked ones show what they cost
function OutfitPicker({ careerSen, outfitId, onOutfit }: { careerSen: number; outfitId: string; onOutfit: (id: string) => void }) {
  const tr = useT();
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-extrabold text-cream/80">{tr.outfitTitle}</span>
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
              o.id === outfitId ? "bg-amber-300 shadow-[0_3px_0_#1f1a17]" : open ? "bg-cream/20 active:scale-95" : "bg-ink/40 opacity-50"
            }`}
          >
            {open ? o.emoji : "🔒"}
          </button>
        );
      })}
    </div>
  );
}

function GameOver({
  s,
  result,
  careerSen,
  onRestart,
}: {
  s: GameState;
  result: ShiftResult | null;
  careerSen: number;
  onRestart: () => void;
}) {
  const tr = useT();
  const lang = useLang();
  const auth = useAuth();
  const { best, submit } = useBestScore(GAME.storageKey);
  const [prevBest] = useState(best);
  const [shareState, setShareState] = useState<ShareOutcome | null>(null);
  const { board, refresh } = useBoard();
  const [saved, setSaved] = useState<{ rank: number | null; daily: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posted = useRef(false);
  const rank = rankFor(s.earned, lang);
  const next = nextRank(s.earned, lang);
  const isRecord = s.earned > prevBest;
  const upcoming = nextUnlock(careerSen);

  useEffect(() => {
    submit(s.earned);
    if (s.earned > prevBest && prevBest > 0) sfx.record();
  }, [s.earned, submit, prevBest]);

  useEffect(() => {
    if (posted.current || s.earned === 0 || !auth.username) return;
    let cancelled = false;
    setSaving(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ earned: s.earned, served: s.served, mode: s.mode, day: dailyKey() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? tr.saveFailed);
        if (cancelled) return;
        posted.current = true;
        setSaved({ rank: data.rank, daily: !!data.daily });
        sfx.correct();
        await refresh();
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setSaving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [s.earned, s.served, s.mode, auth.username, refresh, tr.saveFailed]);

  const onShare = async () => {
    sfx.tap();
    const path = `/${GAME.slug}/k/${encodeResult({ earned: s.earned, served: s.served })}`;
    setShareState(
      await shareResult({
        title: GAME.name,
        text: tr.shareText(rm(s.earned), rank.emoji, rank.title),
        url: `${window.location.origin}${path}`,
        image: `${path}/opengraph-image`,
      }),
    );
  };

  return (
    <div className="absolute inset-0 safe-px flex overflow-y-auto bg-ink/60 safe-pt pb-4 backdrop-blur-[2px]">
      <div className="m-auto flex w-full max-w-4xl animate-pop flex-row items-stretch gap-3">
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl bg-cream p-4 text-center shadow-[0_6px_0_#1f1a17]">
          <p className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">{s.mode === "daily" ? tr.dailyBadge : tr.shiftOver}</p>
          <p className="text-4xl">{rank.emoji}</p>
          <p className="text-base font-extrabold">{rank.title}</p>
          <p className={`text-5xl font-extrabold text-amber-300 ${titleStroke}`}>{rm(s.earned)}</p>
          {isRecord && <p className="rounded-full bg-chili px-3 py-0.5 text-xs font-bold text-white">{tr.newRecord}</p>}
          {/* Where the money came from */}
          <div className="mt-1 grid w-full grid-cols-3 gap-1 text-xs font-bold">
            <span className="rounded-lg bg-leaf/15 py-1">
              {tr.sales}
              <br />
              <b className="text-sm">{rm(s.sales)}</b>
            </span>
            <span className="rounded-lg bg-amber-300/30 py-1">
              {tr.tips}
              <br />
              <b className="text-sm">+{rm(s.tips)}</b>
            </span>
            <span className="rounded-lg bg-chili/15 py-1">
              {tr.wasted}
              <br />
              <b className="text-sm">-{rm(s.wasted)}</b>
            </span>
          </div>
          <div className="grid w-full grid-cols-4 gap-1.5 text-center text-xs">
            <Stat label={tr.stats.served} value={s.served} />
            <Stat label={tr.stats.wrong} value={s.wrong} />
            <Stat label={tr.stats.walkouts} value={s.walkouts} />
            <Stat label={tr.stats.streak} value={s.bestStreak} />
          </div>
          <p className="mt-1 text-xs font-bold text-ink/70">{next ? `🎯 ${tr.nextRank(rm(next.min - s.earned), next.title)}` : tr.topRank}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {result && (result.unlocks.length > 0 || result.outfits.length > 0) && (
            <div className="animate-pop rounded-2xl bg-amber-300 px-3 py-2 text-sm font-extrabold text-ink shadow-[0_4px_0_#1f1a17]">
              {result.unlocks.length > 0 && (
                <p>
                  {tr.unlockedNew} {result.unlocks.map((u) => tr.unlockNames[u.key]).join(", ")}
                </p>
              )}
              {result.outfits.length > 0 && (
                <p>
                  {tr.outfitNew} {result.outfits.join(" ")}
                </p>
              )}
            </div>
          )}
          {!result?.unlocks.length && upcoming && s.mode === "normal" && (
            <p className="rounded-2xl bg-cream/15 px-3 py-1.5 text-center text-xs font-bold text-cream">
              🔒 {tr.nextUnlock(rm(upcoming.at - careerSen), tr.unlockNames[upcoming.key])}
            </p>
          )}
          {s.earned === 0 ? (
            <p className="rounded-2xl bg-cream/15 px-3 py-2 text-center text-sm font-bold text-cream">{tr.zeroScore}</p>
          ) : saved ? (
            <p className="rounded-2xl bg-leaf px-3 py-2 text-center text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">
              {saved.rank ? (saved.daily ? tr.savedRankToday(saved.rank) : tr.savedRank(saved.rank)) : tr.saved}
              {auth.username ? ` · @${auth.username}` : ""}
            </p>
          ) : saving ? (
            <p className="rounded-2xl bg-cream/15 px-3 py-2 text-center text-sm font-bold text-cream">…</p>
          ) : null}
          {error && <p className="text-center text-xs font-bold text-amber-300">{error}</p>}
          <LeaderboardPanel
            board={board}
            highlight={auth.username ?? undefined}
            compact
            initialTab={s.mode === "daily" ? "today" : "week"}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onShare}
              className="flex-1 rounded-2xl bg-chili py-3 text-lg font-extrabold text-white shadow-[0_5px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
            >
              {tr.challengeFriends}
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 rounded-2xl bg-amber-300 py-3 text-lg font-extrabold text-ink shadow-[0_5px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
            >
              {tr.playAgain}
            </button>
          </div>
          {shareState === "copied" && <p className="text-center text-sm font-bold text-cream">{tr.copied}</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream p-1.5 shadow-[0_3px_0_#1f1a17]">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-ink/50">{label}</p>
    </div>
  );
}
