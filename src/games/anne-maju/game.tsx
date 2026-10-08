"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { music, setMuted, sfx, unlockAudio, useMuted } from "@/shared/audio";
import { shareResult, type ShareOutcome } from "@/shared/share";
import { useBestScore } from "@/shared/use-best-score";
import {
  type Cup,
  drinkName,
  isCupComplete,
  orderPhrase,
  randomDrink,
  randomLine,
  sameDrink,
} from "./drinks";
import { LeaderboardPanel, playerId, savedName, useBoard } from "./leaderboard-panel";
import { GAME } from "./meta";
import { encodeResult, rankFor, rm } from "./result";
import { randomLook } from "./scene/look";
import { currentStep, difficulty, type GameState, initialState, lines, reducer, SHIFT_MS, type Spawn, type Step, STEPS, timeLeft } from "./state";

// WebGL only exists in the browser
const MamakScene = dynamic(() => import("./scene/mamak-scene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink/50">Buka kedai...</div>,
});
const DrinkStation = dynamic(() => import("./scene/station"), { ssr: false });
const DemoBackdrop = dynamic(() => import("./scene/demo-backdrop"), { ssr: false });

export function AnneMajuGame({ challenge }: { challenge?: string }) {
  const [s, dispatch] = useReducer(reducer, initialState);
  const [serveEvent, setServeEvent] = useState<{ table: number; id: number } | null>(null);
  const stateRef = useRef(s);
  useLayoutEffect(() => {
    stateRef.current = s;
  });

  useEffect(() => {
    if (s.phase !== "playing") return;
    const id = setInterval(() => {
      const cur = stateRef.current;
      const now = Date.now();
      const free = cur.tables.flatMap((c, i) => (c ? [] : [i]));
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
      if (cur.tables.some((c) => c && c.leaveAt <= now)) sfx.walkout();
      let spawn: Spawn | null = null;
      if (free.length && now >= cur.nextSpawnAt) {
        sfx.arrive();
        const order = randomDrink(difficulty(cur));
        spawn = {
          table: free[Math.floor(Math.random() * free.length)],
          look: randomLook(),
          order,
          phrase: orderPhrase(order),
          askedAgain: false,
        };
      }
      dispatch({ type: "tick", now, spawn, line: randomLine(lines.LEAVE_LINES) });
    }, 100);
    return () => clearInterval(id);
  }, [s.phase]);

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
        <div className="absolute top-3 right-3">
          <MuteButton />
        </div>
        <RotateHint />
      </div>
    );
  }

  const onTable = (i: number) => {
    const c = s.tables[i];
    if (!c || s.now < c.seatedAt) return;
    if (isCupComplete(s.cup)) {
      const correct = sameDrink(s.cup, c.order);
      if (correct) sfx.correct();
      else sfx.wrong();
      dispatch({ type: "serve", table: i, line: randomLine(correct ? lines.HAPPY_LINES : lines.WRONG_LINES) });
      setServeEvent({ table: i, id: (serveEvent?.id ?? 0) + 1 });
    } else if (s.now >= c.revealUntil) {
      sfx.tap();
      dispatch({ type: "askAgain", table: i });
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden select-none">
      <div className="relative min-w-0 flex-1">
        <MamakScene s={s} cupReady={isCupComplete(s.cup)} serveEvent={serveEvent} onTable={onTable} />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Hud s={s} />
          <MuteButton />
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
          <DrinkStation
            cup={s.cup}
            onPick={(part, value) => {
              pickSound(part, value);
              dispatch({ type: "pick", part, value });
            }}
          />
          {s.cup.base && (
            <p className="pointer-events-none absolute inset-x-0 bottom-2 truncate px-3 text-center text-base font-extrabold text-white drop-shadow-[0_2px_0_#1f1a17]">
              {cupTitle(s.cup)}
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
  return (
    <button
      type="button"
      aria-label={muted ? "Buka bunyi" : "Tutup bunyi"}
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

function cupTitle(cup: Cup) {
  return drinkName({ milk: "o", sugar: "biasa", temp: "panas", base: "teh", ...cup });
}

const STEP_META: Record<Step, { title: string; icon: string }> = {
  temp: { title: "Cawan", icon: "☕" },
  base: { title: "Serbuk", icon: "🫙" },
  milk: { title: "Susu", icon: "🥛" },
  sugar: { title: "Gula", icon: "🍬" },
};

const VALUE_LABEL: Record<string, string> = {
  panas: "Panas",
  ais: "Ais",
  teh: "Teh",
  kopi: "Kopi",
  milo: "Milo",
  nescafe: "Nescafe",
  susu: "Susu",
  c: "C",
  o: "O",
  biasa: "Biasa",
  kurang: "Kurang",
  kosong: "Kosong",
};

// Four steps, always visible: done steps show the choice and can be tapped to redo
function StepRail({ cup, onRewind, onDiscard }: { cup: Cup; onRewind: (p: Step) => void; onDiscard: () => void }) {
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
              {i + 1}. {STEP_META[p].title}
            </span>
            <span className="mt-0.5 truncate text-xs font-extrabold">{value ? VALUE_LABEL[value] : STEP_META[p].icon}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onDiscard}
        aria-label="Buang air"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 text-lg active:scale-95"
      >
        🗑️
      </button>
    </div>
  );
}

function RotateHint() {
  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-3 bg-ink text-center text-cream portrait:flex">
      <span className="animate-bounce text-6xl">📱↻</span>
      <p className="text-xl font-extrabold">Pusingkan phone</p>
      <p className="text-sm opacity-70">Game ni main landscape</p>
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

function Intro({ challenge, onStart }: { challenge?: string; onStart: () => void }) {
  const { best } = useBestScore(GAME.storageKey);
  const { board } = useBoard();
  return (
    <div className="absolute inset-0 flex items-center justify-between gap-6 overflow-y-auto bg-gradient-to-r from-ink/80 via-ink/35 to-transparent px-6 py-4 lg:px-14">
      <div className="flex max-w-md flex-col gap-2.5 text-cream">
        <span className="w-fit rounded-full bg-chili px-3 py-1 text-xs font-extrabold tracking-wide uppercase">🇲🇾 Game mamak · 90 saat</span>
        <h1 className={`text-[clamp(2.2rem,7vh,4.5rem)] leading-[0.95] font-extrabold text-amber-300 ${titleStroke}`}>{GAME.name}</h1>
        <p className="text-base font-semibold text-cream/90">{GAME.tagline}</p>
        {challenge && <p className="animate-pop rounded-2xl bg-chili px-4 py-2 font-bold">{challenge}</p>}
        <div className="flex gap-2 text-xs font-bold">
          {["👂 Dengar order", "🫗 Bancuh", "🪑 Hantar"].map((step, i) => (
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
          ▶ Mula shift
        </button>
        <details className="rounded-2xl bg-cream/15 px-3 py-2 text-sm backdrop-blur">
          <summary className="cursor-pointer font-bold">Cara main & kamus mamak</summary>
          <ul className="mt-2 space-y-1 text-xs text-cream/90">
            <li>☕ 4 langkah: cawan (panas/ais) → serbuk → susu → gula.</li>
            <li>🥛 <b>O</b> = tak letak susu · <b>C</b> = susu cair.</li>
            <li>🍬 <b>Kurang</b> = kurang manis · <b>Kosong</b> = tak letak gula.</li>
            <li>🤔 Lupa order? Tap pelanggan, tanya balik (tip kurang).</li>
            <li>🍵 <b>Teh tarik</b> = panas + teh + susu + biasa.</li>
          </ul>
        </details>
        {best > 0 && <p className="text-sm font-bold text-cream/80">🏆 Rekod kau: {rm(best)}</p>}
      </div>
      <div className="hidden w-64 shrink-0 self-end sm:block lg:w-72">
        <LeaderboardPanel board={board} highlight={savedName()} compact />
      </div>
    </div>
  );
}

function GameOver({ s, onRestart }: { s: GameState; onRestart: () => void }) {
  const { best, submit } = useBestScore(GAME.storageKey);
  const [prevBest] = useState(best);
  const [shareState, setShareState] = useState<ShareOutcome | null>(null);
  const { board, refresh } = useBoard();
  const [name, setName] = useState(savedName);
  const [saved, setSaved] = useState<{ rank: number | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rank = rankFor(s.earned);
  const isRecord = s.earned > prevBest;

  useEffect(() => {
    submit(s.earned);
    if (s.earned > prevBest && prevBest > 0) sfx.record();
  }, [s.earned, submit, prevBest]);

  const onShare = async () => {
    sfx.tap();
    const url = `${window.location.origin}/${GAME.slug}/k/${encodeResult({ earned: s.earned, served: s.served })}`;
    const text = `Aku kutip ${rm(s.earned)} satu shift kat ${GAME.name} ${rank.emoji} (${rank.title}). Kau boleh lawan?`;
    setShareState(await shareResult({ title: GAME.name, text, url }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) return setError("Nama minimum 2 huruf");
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
      if (!res.ok) throw new Error(data.error ?? "Tak dapat simpan");
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
          <p className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">Shift habis!</p>
          <p className="text-5xl">{rank.emoji}</p>
          <p className="text-base font-extrabold">{rank.title}</p>
          <p className={`text-5xl font-extrabold text-amber-300 ${titleStroke}`}>{rm(s.earned)}</p>
          {isRecord && <p className="mt-1 rounded-full bg-chili px-3 py-0.5 text-xs font-bold text-white">Rekod baru!</p>}
          <div className="mt-3 grid w-full grid-cols-4 gap-1.5 text-center text-xs">
            <Stat label="Hantar" value={s.served} />
            <Stat label="Salah" value={s.wrong} />
            <Stat label="Lari" value={s.walkouts} />
            <Stat label="Streak" value={s.bestStreak} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {s.earned === 0 ? (
            <p className="rounded-2xl bg-cream/15 px-3 py-2 text-center text-sm font-bold text-cream">Hantar sekurang-kurangnya satu air untuk masuk papan juara</p>
          ) : saved ? (
            <p className="rounded-2xl bg-leaf px-3 py-2 text-center text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">
              {saved.rank ? `Kau nombor ${saved.rank} minggu ni!` : "Skor disimpan!"}
            </p>
          ) : (
            <form onSubmit={onSave} className="flex gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                placeholder="Nama kau"
                maxLength={16}
                className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-cream px-3 py-2 font-bold text-ink outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-amber-300 px-3 font-extrabold text-ink shadow-[0_4px_0_#1f1a17] active:translate-y-0.5 disabled:opacity-60"
              >
                {saving ? "..." : "Simpan"}
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
              Cabar kawan
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 rounded-2xl bg-amber-300 py-3 text-lg font-extrabold text-ink shadow-[0_5px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
            >
              ▶ Main lagi
            </button>
          </div>
          {shareState === "copied" && <p className="text-center text-sm font-bold text-cream">Link dah copy. Paste kat Threads!</p>}
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
