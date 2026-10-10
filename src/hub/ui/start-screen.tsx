"use client";

import { Logo } from "@/shared/logo";
import type { HUB_STRINGS } from "../strings";

// Title screen over the live city: logo, what's inside, and one big button to start walking
export function StartScreen({ tr, touch, onStart }: { tr: (typeof HUB_STRINGS)["ms"]; touch: boolean; onStart: () => void }) {
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

