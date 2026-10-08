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

      {/* Brand (top-left) */}
      <div className="edge-tl pointer-events-none absolute z-20">
        {/* Just the wordmark, game-HUD style: no card, slight tilt, soft drop shadow */}
        <div className={`-rotate-3 drop-shadow-[0_3px_0_rgba(31,26,23,0.35)] transition-opacity duration-500 ${started ? "" : "opacity-0"}`}>
          <Logo size="hud" />
        </div>
      </div>

      {/* Settings + minimap (top-right) */}
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
        {started && (
          <div className="pointer-events-auto">
            <Minimap size={touch ? 104 : 140} />
          </div>
        )}
      </div>

      {!started && <StartScreen tr={tr} touch={touch} onStart={start} />}

      {toast && (
        <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
          <p className="animate-pop rounded-2xl bg-[#ff5a7a] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#1f1a17]">{toast.text}</p>
        </div>
      )}

      {/* Goal hint, hidden once there's something to do right here */}
      {started && !zone && nearCat === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 px-4 text-center">
          <p className="rounded-full bg-amber-300 px-4 py-1.5 text-sm font-extrabold text-ink shadow-[0_4px_0_#1f1a17]">
            {featured.game!.emoji} {tr.goTo(featured.game!.title)}
          </p>
          <p className="rounded-full bg-ink/70 px-3 py-0.5 text-[11px] font-bold text-cream">{touch ? tr.hintTouch : tr.hintDesktop}</p>
        </div>
      )}

      {/* Context actions (bottom-right, in thumb reach): the door is primary, a nearby cat sits above it */}
      {started && (zone || nearCat !== null) && (
        <div className="edge-br absolute z-10 flex flex-col items-end gap-3">
          {nearCat !== null && (
            <ActionButton
              icon="🐱"
              label={tr.petCat(CATS[nearCat].name)}
              keyHint={!touch && !zone ? "E" : undefined}
              tone="cream"
              size={zone ? "sm" : "lg"}
              onClick={() => pet(nearCat)}
            />
          )}
          {zone &&
            (zone.game ? (
              <ActionButton
                icon="▶"
                label={`${zone.game.emoji} ${zone.game.title}`}
                caption={tr.enter}
                keyHint={!touch ? "E" : undefined}
                tone="amber"
                size="lg"
                onClick={() => enter(zone)}
              />
            ) : (
              <ActionButton icon="🔒" label={`${zone.soon!.emoji} ${zone.soon!.title}`} caption={tr.soon} sub={tr.soonBody} tone="muted" size="lg" />
            ))}
        </div>
      )}

      {started && touch && <Joystick />}
    </div>
  );
}

// Title screen over the live city: logo, what's inside, and one big button to start walking
function StartScreen({ tr, touch, onStart }: { tr: (typeof HUB_STRINGS)["ms"]; touch: boolean; onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex cursor-pointer overflow-y-auto text-center text-cream" onClick={onStart}>
      {/* Warm golden-hour vignette: the live city stays visible in the middle */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(31,26,23,0.15)_0%,rgba(31,26,23,0.55)_55%,rgba(31,26,23,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#ff9a3d]/25 via-transparent to-[#2f1b4a]/35" />

      <div className="safe-px relative m-auto flex flex-col items-center gap-4 py-8 max-sm:[zoom:0.78] [@media(max-height:480px)]:[zoom:0.72]">
        {/* Logo with a sticker badge slapped on the corner */}
        <div className="relative animate-[float_4s_ease-in-out_infinite]">
          <h1 className="animate-pop">
            <Logo size="lg" className="items-center" />
          </h1>
          <span className="absolute -right-8 -bottom-3 -rotate-6 rounded-full border-[3px] border-ink bg-chili px-3 py-1 text-xs font-extrabold whitespace-nowrap text-white shadow-[0_3px_0_#1f1a17] sm:-right-10 sm:text-sm">
            🇲🇾 {tr.brand}
          </span>
        </div>

        {/* Tagline as a comic speech bubble */}
        <div className="relative mt-1 max-w-md rounded-2xl border-[3px] border-ink bg-cream px-5 py-3 text-base leading-snug font-bold text-ink shadow-[0_5px_0_#1f1a17] sm:text-lg">
          <span className="absolute -top-[11px] left-1/2 size-5 -translate-x-1/2 rotate-45 border-t-[3px] border-l-[3px] border-ink bg-cream" />
          {tr.tagline}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          className="mt-2 animate-[glow_2.2s_ease-in-out_infinite] rounded-2xl border-4 border-ink bg-amber-300 px-10 py-4 text-2xl font-extrabold text-ink transition hover:-translate-y-0.5 active:translate-y-1 sm:text-3xl"
        >
          {tr.startCta}
        </button>

        {/* Controls as keycaps (desktop) or a simple hint (touch) */}
        {touch ? (
          <p className="rounded-full bg-ink/60 px-4 py-1.5 text-xs font-bold text-cream/90 backdrop-blur">🕹️ {tr.controlsTouch.replace("🎮 ", "")}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-ink/55 px-4 py-2 text-xs font-bold text-cream/90 backdrop-blur">
            <span className="flex items-center gap-1">
              {["W", "A", "S", "D"].map((k) => (
                <Keycap key={k}>{k}</Keycap>
              ))}
              <span className="ml-1">{tr.keysWalk}</span>
            </span>
            <span className="flex items-center gap-1">
              <Keycap wide>Enter</Keycap>
              <span>{tr.keysEnter}</span>
            </span>
            <span className="flex items-center gap-1">
              <Keycap>🖱️</Keycap>
              <span>{tr.keysClick}</span>
            </span>
          </div>
        )}

        <p className="mt-1 text-[11px] font-bold tracking-wide text-cream/60">{tr.madeIn}</p>
      </div>
    </div>
  );
}

function Keycap({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <kbd
      className={`grid h-6 place-items-center rounded-md border-2 border-cream/80 bg-cream/10 text-[11px] font-extrabold text-cream shadow-[0_2px_0_rgba(251,243,228,0.6)] ${wide ? "px-1.5" : "w-6"}`}
    >
      {children}
    </kbd>
  );
}

// Round thumb-sized action with a label chip on its left
function ActionButton({
  icon,
  label,
  caption,
  sub,
  keyHint,
  tone,
  size,
  onClick,
}: {
  icon: string;
  label: string;
  caption?: string;
  sub?: string;
  keyHint?: string;
  tone: "amber" | "cream" | "muted";
  size: "sm" | "lg";
  onClick?: () => void;
}) {
  const circle = size === "lg" ? "size-20 text-3xl" : "size-14 text-2xl";
  const colors = tone === "amber" ? "bg-amber-300 text-ink" : tone === "cream" ? "bg-cream text-ink" : "bg-ink/60 text-cream/80";
  return (
    <div className="flex animate-pop items-center gap-2">
      <div className="max-w-[46vw] rounded-2xl bg-ink/80 px-3 py-1.5 text-right text-cream shadow-lg">
        <p className="text-sm leading-tight font-extrabold">{label}</p>
        {sub && <p className="text-[11px] leading-tight font-bold text-cream/70">{sub}</p>}
      </div>
      <button
        type="button"
        disabled={!onClick}
        onClick={onClick}
        aria-label={caption ? `${caption}: ${label}` : label}
        className={`relative grid ${circle} shrink-0 place-items-center rounded-full border-4 border-ink font-extrabold shadow-[0_5px_0_#1f1a17] transition active:translate-y-1 active:shadow-[0_2px_0_#1f1a17] disabled:active:translate-y-0 ${colors}`}
      >
        <span className="leading-none">{icon}</span>
        {caption && <span className="absolute bottom-1.5 text-[10px] leading-none font-extrabold uppercase">{caption}</span>}
        {keyHint && (
          <span className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-md border-2 border-ink bg-cream text-[11px] font-extrabold text-ink">
            {keyHint}
          </span>
        )}
      </button>
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
