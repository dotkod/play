"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ambience, audioReady, music, setMuted, sfx, unlockAudio, useMuted } from "@/shared/audio";
import { setLang, useLang } from "@/shared/lang";
import { bindKeyboard, input } from "./controls";
import { HUB_STRINGS } from "./strings";
import { type Building, BUILDINGS, doorSpot } from "./world-data";

const World = dynamic(() => import("./world"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#9fdcd2] text-sm font-bold text-ink/60">…</div>,
});

// Games send players back here with this key so they reappear at the building they left
export const SPAWN_KEY = "dotkod-play:spawn";
const DEFAULT_SPAWN = { x: 4.2, z: 4.6, rotY: Math.PI * 0.8 };

function readSpawn() {
  try {
    const id = sessionStorage.getItem(SPAWN_KEY);
    sessionStorage.removeItem(SPAWN_KEY);
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return DEFAULT_SPAWN;
    const d = doorSpot(b);
    // Step a little further out and face the road
    return { x: d.x, z: d.z + d.facing * 1.2, rotY: d.facing > 0 ? 0 : Math.PI };
  } catch {
    return DEFAULT_SPAWN;
  }
}

export function Hub() {
  const router = useRouter();
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const [spawn] = useState(() => (typeof window === "undefined" ? DEFAULT_SPAWN : readSpawn()));
  const [zone, setZone] = useState<Building | null>(null);
  const [touch, setTouch] = useState(false);
  const featured = BUILDINGS.find((b) => b.game)!;

  useEffect(() => bindKeyboard(), []);

  // City soundscape: starts on the first interaction (or right away if audio was already unlocked in a game)
  useEffect(() => {
    const begin = () => {
      unlockAudio();
      music.start("city");
      ambience.start();
    };
    if (audioReady()) begin();
    window.addEventListener("pointerdown", begin, { once: true });
    window.addEventListener("keydown", begin, { once: true });
    return () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("keydown", begin);
      music.stop();
      ambience.stop();
    };
  }, []);

  // A soft chime whenever you step up to a door
  useEffect(() => {
    if (zone) sfx.chime();
  }, [zone]);
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

  const enter = (b: Building) => {
    if (!b.game) return;
    sfx.doorbell();
    ambience.stop();
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
      if (zone?.game) enter(zone);
    }, 50);
    return () => clearInterval(id);
  });

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none">
      <World spawn={spawn} onZone={setZone} />

      {/* Brand + language */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="pointer-events-auto rounded-2xl bg-ink/85 px-3 py-1.5 text-cream shadow-[0_4px_0_#1f1a17]">
          <p className="text-xl leading-none font-extrabold tracking-wide text-amber-300 [-webkit-text-stroke:4px_#1f1a17] [paint-order:stroke_fill]">▶ PLAY</p>
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

      {/* Goal hint, hidden once you're at a door */}
      {!zone && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 px-4 text-center">
          <p className="rounded-full bg-amber-300 px-4 py-1.5 text-sm font-extrabold text-ink shadow-[0_4px_0_#1f1a17]">
            {featured.game!.emoji} {tr.goTo(featured.game!.title)}
          </p>
          <p className="rounded-full bg-ink/70 px-3 py-0.5 text-[11px] font-bold text-cream">{touch ? tr.hintTouch : tr.hintDesktop}</p>
        </div>
      )}

      {/* Door prompt */}
      {zone && (
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

      {touch && <Joystick />}
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
      className="absolute bottom-16 left-6 size-32 touch-none rounded-full border-4 border-ink/40 bg-ink/25 backdrop-blur-sm"
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
