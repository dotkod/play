"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ambience, audioReady, music, setMuted, sfx, unlockAudio, useMuted } from "@/shared/audio";
import { setLang, useLang } from "@/shared/lang";
import { Logo } from "@/shared/logo";
import { CATS, petCat } from "./cats";
import { bindKeyboard, input } from "./controls";
import { Minimap } from "./minimap";
import { HUB_STRINGS } from "./strings";
import { type Building, BUILDINGS, doorSpot } from "./world-data";

const World = dynamic(() => import("./world"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#9fdcd2] text-sm font-bold text-ink/60">…</div>,
});

// Games send players back here with this key so they reappear at the building they left
export const SPAWN_KEY = "dotkod-play:spawn";
const DEFAULT_SPAWN = { x: 7.5, z: -4.4, rotY: Math.PI / 2 };

// Returning from a game skips the start screen and puts you back at that building's door
function readSpawn() {
  const fresh = { spawn: DEFAULT_SPAWN, returning: false };
  if (typeof window === "undefined") return fresh;
  try {
    const id = sessionStorage.getItem(SPAWN_KEY);
    sessionStorage.removeItem(SPAWN_KEY);
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return fresh;
    const d = doorSpot(b);
    // Step a little further out and face the road
    return { spawn: { x: d.x, z: d.z + d.facing * 1.2, rotY: d.facing > 0 ? 0 : Math.PI }, returning: true };
  } catch {
    return fresh;
  }
}

export function Hub() {
  const router = useRouter();
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const [{ spawn, returning }] = useState(readSpawn);
  const [started, setStarted] = useState(returning);
  const [zone, setZone] = useState<Building | null>(null);
  const [nearCat, setNearCat] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [touch, setTouch] = useState(false);
  const featured = BUILDINGS.find((b) => b.game)!;

  useEffect(() => bindKeyboard(), []);

  // City soundscape only starts from the start button; coming back from a game resumes it,
  // since the player already opted in. It always stops when leaving the city.
  useEffect(() => {
    if (returning && audioReady()) {
      music.start("city");
      ambience.start();
    }
    return () => {
      music.stop();
      ambience.stop();
    };
  }, [returning]);

  // A soft chime whenever you step up to a door
  useEffect(() => {
    if (zone) sfx.chime();
  }, [zone]);
  const start = () => {
    unlockAudio();
    sfx.start();
    music.start("city");
    ambience.start();
    setStarted(true);
  };

  // Enter or Space dismisses the start screen
  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.enter = false;
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const mq = matchMedia("(pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Warm up the game route while the player walks over
  useEffect(() => {
    if (featured.game) router.prefetch(`/${featured.game.slug}`);
  }, [router, featured]);

  const pet = (i: number) => {
    unlockAudio();
    const n = petCat(i);
    const id = Date.now();
    setToast({ text: tr.catLoves(CATS[i].name, n), id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600);
  };

  const enter = (b: Building) => {
    if (!b.game) return;
    sfx.doorbell();
    // Silence the city; the game's own music starts with its start button
    ambience.stop();
    music.stop();
    try {
      sessionStorage.setItem(SPAWN_KEY, b.id);
    } catch {}
    router.push(`/${b.game.slug}`);
  };

  // Enter/E at a door
  useEffect(() => {
    const id = setInterval(() => {
      if (!input.enter) return;
      input.enter = false;
      if (!started) return;
      if (zone?.game) enter(zone);
      else if (nearCat !== null) pet(nearCat);
    }, 50);
    return () => clearInterval(id);
  });

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <World spawn={spawn} onZone={setZone} onNearCat={setNearCat} active={started} />

      {/* Brand + language */}
      <div className="edge-top pointer-events-none absolute z-20 flex items-start justify-between gap-2">
        <div className={`pointer-events-auto rounded-2xl bg-ink/85 px-3 py-1.5 text-cream shadow-[0_4px_0_#1f1a17] transition-opacity ${started ? "" : "opacity-0"}`}>
          <Logo size="sm" />
          <p className="text-[11px] font-bold opacity-80">{tr.brand}</p>
        </div>
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
      </div>

      {!started && <StartScreen tr={tr} touch={touch} onStart={start} />}

      {started && (
        <div className="edge-br absolute">
          <Minimap size={touch ? 112 : 150} />
        </div>
      )}

      {/* Cat nearby: offer a pet (stacked above the door prompt when both apply) */}
      {started && nearCat !== null && (
        <div className={`absolute inset-x-0 flex justify-center px-4 ${zone ? "bottom-24" : "bottom-4"}`}>
          <button
            type="button"
            onClick={() => pet(nearCat)}
            className="animate-pop rounded-2xl bg-cream px-5 py-2.5 text-lg font-extrabold text-ink shadow-[0_5px_0_#1f1a17] active:translate-y-0.5"
          >
            🐱 {tr.petCat(CATS[nearCat].name)}
          </button>
        </div>
      )}

      {toast && (
        <div key={toast.id} className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4">
          <p className="animate-pop rounded-2xl bg-[#ff5a7a] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">{toast.text}</p>
        </div>
      )}

      {/* Goal hint, hidden once you're at a door or next to a cat */}
      {started && !zone && nearCat === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 px-4 text-center">
          <p className="rounded-full bg-amber-300 px-4 py-1.5 text-sm font-extrabold text-ink shadow-[0_4px_0_#1f1a17]">
            {featured.game!.emoji} {tr.goTo(featured.game!.title)}
          </p>
          <p className="rounded-full bg-ink/70 px-3 py-0.5 text-[11px] font-bold text-cream">{touch ? tr.hintTouch : tr.hintDesktop}</p>
        </div>
      )}

      {/* Door prompt */}
      {started && zone && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
          <div className="flex animate-pop items-center gap-3 rounded-2xl bg-cream p-2 pl-4 shadow-[0_6px_0_#1f1a17]">
            <div>
              <p className="text-lg leading-tight font-extrabold">
                {(zone.game ?? zone.soon)!.emoji} {(zone.game ?? zone.soon)!.title}
              </p>
              {zone.soon && <p className="text-xs font-bold text-ink/60">{tr.soonBody}</p>}
            </div>
            {zone.game ? (
              <button
                type="button"
                onClick={() => enter(zone)}
                className="rounded-xl bg-amber-300 px-5 py-2.5 text-lg font-extrabold text-ink shadow-[0_4px_0_#1f1a17] active:translate-y-0.5"
              >
                {tr.enter} ▶
              </button>
            ) : (
              <span className="rounded-xl bg-ink/10 px-3 py-2 text-sm font-extrabold text-ink/60">🔒 {tr.soon}</span>
            )}
          </div>
        </div>
      )}

      {started && touch && <Joystick />}
    </div>
  );
}

// Title screen over the live city: logo, what's inside, and one big button to start walking
function StartScreen({ tr, touch, onStart }: { tr: (typeof HUB_STRINGS)["ms"]; touch: boolean; onStart: () => void }) {
  return (
    <div
      className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-4 overflow-y-auto bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80 px-6 py-8 text-center text-cream"
      onClick={onStart}
    >
      <h1 className="animate-pop">
        <Logo size="lg" className="items-center" />
      </h1>
      <span className="rounded-full bg-chili px-4 py-1 text-sm font-extrabold tracking-wide">🇲🇾 {tr.brand}</span>
      <p className="max-w-md text-base font-bold text-cream/90 sm:text-lg">{tr.tagline}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStart();
        }}
        className="mt-2 rounded-2xl bg-amber-300 px-10 py-4 text-2xl font-extrabold text-ink shadow-[0_6px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17]"
      >
        {tr.startCta}
      </button>
      {!touch && <p className="text-xs font-bold text-cream/60">{tr.startKey}</p>}
      <p className="text-xs font-bold text-cream/70">{touch ? tr.controlsTouch : tr.controlsDesktop}</p>
    </div>
  );
}

function MuteButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      aria-label={muted ? "Unmute" : "Mute"}
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

// Thumb stick for touch screens, bottom-left
function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const R = 46;

  const move = (e: React.PointerEvent) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    input.joy.x = dx / R;
    input.joy.y = -dy / R;
    input.target = null;
  };
  const end = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    input.joy.x = 0;
    input.joy.y = 0;
  };

  return (
    <div
      ref={base}
      className="edge-bl absolute mb-12 ml-3 size-32 touch-none rounded-full border-4 border-ink/40 bg-ink/25 backdrop-blur-sm"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => pointer.current === e.pointerId && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute top-1/2 left-1/2 size-14 rounded-full border-4 border-ink bg-amber-300 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
