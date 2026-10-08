"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { music, setMuted, sfx, unlockAudio, useMuted } from "@/shared/audio";
import { shareResult, type ShareOutcome } from "@/shared/share";
import { useBestScore } from "@/shared/use-best-score";
import { type Cup, drinkName, isCupComplete, randomDrink, randomLine, sameDrink } from "./drinks";
import { getLang, type Lang, setLang, t, useLang, useT } from "./i18n";
import { LeaderboardPanel, playerId, savedName, useBoard } from "./leaderboard-panel";
import { GAME } from "./meta";
import { encodeResult, rankFor, rm } from "./result";
import { randomParty } from "@/shared/three/look";
import {
  currentStep,
  difficulty,
  type GameState,
  initialState,
  type Lines,
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

// Customer lines are picked at dispatch time in whatever language is active
function lines(): Lines {
  const tr = t(getLang());
  return { happy: randomLine(tr.happy), wrong: randomLine(tr.wrong), leave: randomLine(tr.leave), annoyed: tr.annoyedAsk, refused: tr.refusedAsk };
}

export function AnneMajuGame({ challenge }: { challenge?: number }) {
  const [s, dispatch] = useReducer(reducer, initialState);
  const [serveEvent, setServeEvent] = useState<{ table: number; id: number } | null>(null);
  const lang = useLang();
  const stateRef = useRef(s);
  useLayoutEffect(() => {
    stateRef.current = s;
  });

  useEffect(() => {
    if (s.phase !== "playing") return;
    const id = setInterval(() => {
      const cur = stateRef.current;
      const now = Date.now();
      const free = cur.tables.flatMap((p, i) => (p ? [] : [i]));
      // Sound cues derived from what this tick is about to change
      const leftBefore = Math.ceil(timeLeft(cur) / 1000);
      const leftNow = Math.ceil(Math.max(0, SHIFT_MS - (now - cur.startAt)) / 1000);
      if (leftNow !== leftBefore && leftNow <= 10 && leftNow > 0) {
        sfx.tick();
        if (leftNow === 10) music.setTempo(132);
      }
      if (leftNow === 0) {
        sfx.over();
        music.setTempo(112);
      }
      if (cur.tables.some((p) => p && p.leaveAt <= now)) sfx.walkout();
      let spawn: Spawn | null = null;
      if (free.length && now >= cur.nextSpawnAt) {
        sfx.arrive();
        const d = difficulty(cur);
        spawn = {
          table: free[Math.floor(Math.random() * free.length)],
          guests: randomParty(partySize(d)).map((look) => ({ look, order: randomDrink(d), served: false })),
          seed: Math.floor(Math.random() * 1000),
        };
      }
      dispatch({ type: "tick", now, spawn, lines: lines() });
    }, 100);
    return () => clearInterval(id);
  }, [s.phase]);

  // Stable so the memoised 3D counter doesn't re-render on every game tick
  const onPick = useCallback((part: Step, value: string) => {
    pickSound(part, value);
    dispatch({ type: "pick", part, value });
  }, []);

  if (s.phase !== "playing") {
    const start = () => {
      goLandscape();
      unlockAudio();
      sfx.start();
      music.setTempo(112);
      music.start();
      dispatch({ type: "start", now: Date.now() });
    };
    return (
      <div
        className="relative h-dvh w-full overflow-hidden select-none"
        onPointerDown={() => {
          // First touch anywhere starts the shop music
          unlockAudio();
          music.start();
        }}
      >
        <DemoBackdrop />
        {s.phase === "intro" ? <Intro challenge={challenge} onStart={start} /> : <GameOver s={s} onRestart={start} />}
        <div className="absolute top-3 left-3">
          <BackToPlay />
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
          <LangToggle />
          <MuteButton />
        </div>
        <RotateHint />
      </div>
    );
  }

  const onTable = (i: number) => {
    const p = s.tables[i];
    if (!p || s.now < p.seatedAt) return;
    const cup = s.cup;
    if (isCupComplete(cup)) {
      const correct = p.guests.some((g) => !g.served && sameDrink(cup, g.order));
      if (correct) sfx.correct();
      else sfx.wrong();
      dispatch({ type: "serve", table: i, lines: lines() });
      setServeEvent({ table: i, id: (serveEvent?.id ?? 0) + 1 });
    } else if (s.now >= p.revealUntil) {
      sfx.tap();
      dispatch({ type: "askAgain", table: i, lines: lines() });
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden select-none">
      <div className="relative min-w-0 flex-1">
        <MamakScene s={s} cupReady={isCupComplete(s.cup)} serveEvent={serveEvent} onTable={onTable} />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <Hud s={s} />
          <MuteButton />
          <LangToggle />
        </div>
      </div>
      <div className="flex h-full w-[min(360px,44vw)] shrink-0 flex-col bg-[#2f8f86] shadow-[-4px_0_20px_rgba(0,0,0,0.15)]">
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
        <div className="relative min-h-0 flex-1">
          <DrinkStation cup={s.cup} lang={lang} onPick={onPick} />
          {s.cup.base && (
            <p className="pointer-events-none absolute inset-x-0 bottom-2 truncate px-3 text-center text-base font-extrabold text-white drop-shadow-[0_2px_0_#1f1a17]">
              {cupTitle(s.cup, lang)}
            </p>
          )}
        </div>
      </div>
      <RotateHint />
    </div>
  );
}

function Hud({ s }: { s: GameState }) {
  const secs = Math.ceil(timeLeft(s) / 1000);
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-ink/90 px-4 py-1.5 font-bold text-cream shadow-lg">
      <span className={secs <= 10 ? "animate-pulse text-chili" : ""}>⏱ {secs}s</span>
      <span>{rm(s.earned)}</span>
      <span>🔥 {s.streak}</span>
    </div>
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

// Back to the Play city; the hub reads this key to put you outside the restaurant door
function BackToPlay() {
  return (
    <Link
      href="/"
      onClick={() => {
        music.stop();
        try {
          sessionStorage.setItem("dotkod-play:spawn", GAME.slug);
        } catch {}
      }}
      className="flex h-9 items-center gap-1 rounded-xl bg-ink/80 px-3 text-sm font-extrabold text-amber-300 shadow-lg active:scale-95"
    >
      ← PLAY
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
            <span className="text-[10px] font-bold opacity-70">
              {i + 1}. {tr.steps[p]}
            </span>
            <span className="mt-0.5 truncate text-xs font-extrabold">{value ? tr.values[value] : STEP_ICON[p]}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onDiscard}
        aria-label={tr.discard}
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 text-lg active:scale-95"
      >
        🗑️
      </button>
    </div>
  );
}

function RotateHint() {
  const tr = useT();
  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-3 bg-ink text-center text-cream portrait:flex">
      <span className="animate-bounce text-6xl">📱↻</span>
      <p className="text-xl font-extrabold">{tr.rotate}</p>
      <p className="text-sm opacity-70">{tr.rotateSub}</p>
    </div>
  );
}

// Best effort: Android Chrome can lock orientation once fullscreen; iOS ignores this and shows RotateHint
function goLandscape() {
  const el = document.documentElement;
  if (!el.requestFullscreen || !matchMedia("(pointer: coarse)").matches) return;
  el.requestFullscreen()
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
    .catch(() => {});
}

const titleStroke = "[-webkit-text-stroke:7px_#1f1a17] [paint-order:stroke_fill]";

function Intro({ challenge, onStart }: { challenge?: number; onStart: () => void }) {
  const tr = useT();
  const lang = useLang();
  const { best } = useBestScore(GAME.storageKey);
  const { board } = useBoard();
  return (
    <div className="absolute inset-0 flex items-center justify-between gap-6 overflow-y-auto bg-gradient-to-r from-ink/80 via-ink/35 to-transparent px-6 py-4 lg:px-14">
      <div className="flex max-w-md flex-col gap-2.5 text-cream">
        <span className="w-fit rounded-full bg-chili px-3 py-1 text-xs font-extrabold tracking-wide uppercase">{tr.badge}</span>
        <h1 className={`text-[clamp(2.2rem,7vh,4.5rem)] leading-[0.95] font-extrabold text-amber-300 ${titleStroke}`}>{GAME.name}</h1>
        <p className="text-base font-semibold text-cream/90">{tr.tagline}</p>
        {challenge !== undefined && <p className="animate-pop rounded-2xl bg-chili px-4 py-2 font-bold">{tr.challenge(rm(challenge), rankFor(challenge, lang).title)}</p>}
        <div className="flex gap-2 text-xs font-bold">
          {tr.steps3.map((step, i) => (
            <span key={step} className="rounded-xl bg-cream/15 px-2.5 py-1.5 backdrop-blur">
              {i + 1}. {step}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onStart}
          className="mt-1 rounded-2xl bg-amber-300 py-4 text-2xl font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
        >
          {tr.start}
        </button>
        <details className="rounded-2xl bg-cream/15 px-3 py-2 text-sm backdrop-blur">
          <summary className="cursor-pointer font-bold">{tr.howTo}</summary>
          <ul className="mt-2 space-y-1 text-xs text-cream/90">
            {tr.howToItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
        {best > 0 && (
          <p className="text-sm font-bold text-cream/80">
            {tr.yourBest} {rm(best)}
          </p>
        )}
      </div>
      <div className="hidden w-64 shrink-0 self-end sm:block lg:w-72">
        <LeaderboardPanel board={board} highlight={savedName()} compact />
      </div>
    </div>
  );
}

function GameOver({ s, onRestart }: { s: GameState; onRestart: () => void }) {
  const tr = useT();
  const lang = useLang();
  const { best, submit } = useBestScore(GAME.storageKey);
  const [prevBest] = useState(best);
  const [shareState, setShareState] = useState<ShareOutcome | null>(null);
  const { board, refresh } = useBoard();
  const [name, setName] = useState(savedName);
  const [saved, setSaved] = useState<{ rank: number | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rank = rankFor(s.earned, lang);
  const isRecord = s.earned > prevBest;

  useEffect(() => {
    submit(s.earned);
    if (s.earned > prevBest && prevBest > 0) sfx.record();
  }, [s.earned, submit, prevBest]);

  const onShare = async () => {
    sfx.tap();
    const url = `${window.location.origin}/${GAME.slug}/k/${encodeResult({ earned: s.earned, served: s.served })}`;
    setShareState(await shareResult({ title: GAME.name, text: tr.shareText(rm(s.earned), rank.emoji, rank.title), url }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) return setError(tr.nameTooShort);
    setSaving(true);
    setError(null);
    try {
      localStorage.setItem("anne-maju:player-name", clean);
    } catch {}
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId: playerId(), name: clean, earned: s.earned, served: s.served }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tr.saveFailed);
      setSaved({ rank: data.weekRank });
      sfx.correct();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-[2px]">
      <div className="flex w-full max-w-4xl animate-pop flex-row items-stretch gap-3">
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-cream p-4 text-center shadow-[0_6px_0_#1f1a17]">
          <p className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">{tr.shiftOver}</p>
          <p className="text-5xl">{rank.emoji}</p>
          <p className="text-base font-extrabold">{rank.title}</p>
          <p className={`text-5xl font-extrabold text-amber-300 ${titleStroke}`}>{rm(s.earned)}</p>
          {isRecord && <p className="mt-1 rounded-full bg-chili px-3 py-0.5 text-xs font-bold text-white">{tr.newRecord}</p>}
          <div className="mt-3 grid w-full grid-cols-4 gap-1.5 text-center text-xs">
            <Stat label={tr.stats.served} value={s.served} />
            <Stat label={tr.stats.wrong} value={s.wrong} />
            <Stat label={tr.stats.walkouts} value={s.walkouts} />
            <Stat label={tr.stats.streak} value={s.bestStreak} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {s.earned === 0 ? (
            <p className="rounded-2xl bg-cream/15 px-3 py-2 text-center text-sm font-bold text-cream">{tr.zeroScore}</p>
          ) : saved ? (
            <p className="rounded-2xl bg-leaf px-3 py-2 text-center text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">
              {saved.rank ? tr.savedRank(saved.rank) : tr.saved}
            </p>
          ) : (
            <form onSubmit={onSave} className="flex gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                placeholder={tr.namePlaceholder}
                maxLength={16}
                className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-cream px-3 py-2 font-bold text-ink outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-amber-300 px-3 font-extrabold text-ink shadow-[0_4px_0_#1f1a17] active:translate-y-0.5 disabled:opacity-60"
              >
                {saving ? "..." : tr.save}
              </button>
            </form>
          )}
          {error && <p className="text-center text-xs font-bold text-amber-300">{error}</p>}
          <LeaderboardPanel board={board} highlight={saved ? name.trim() : undefined} compact />
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
    <div className="rounded-xl bg-cream p-2 shadow-[0_3px_0_#1f1a17]">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="text-ink/50">{label}</p>
    </div>
  );
}
