"use client";

import { useLang } from "@/shared/lang";
import { Logo } from "@/shared/logo";

const COPY = {
  ms: {
    title: "Pusing ke landscape",
    sub: "Kuala Lepak main melintang — putar phone kau.",
  },
  en: {
    title: "Turn to landscape",
    sub: "Kuala Lepak plays sideways — rotate your phone.",
  },
} as const;

/**
 * Blocks the whole app while the device is in portrait.
 * Reuse on hub, auth, and mini-games — one screen, same rules.
 */
export function LandscapeGate() {
  const lang = useLang();
  const tr = COPY[lang];

  return (
    <div
      className="fixed inset-0 z-[200] hidden flex-col items-center justify-center gap-5 bg-[#1f1a17] px-6 text-center portrait:flex"
      role="dialog"
      aria-modal="true"
      aria-label={tr.title}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(252,211,77,0.12)_0%,transparent_55%)]" />
      <Logo size="hud" className="items-center opacity-90" />

      {/* Phone flipping to landscape */}
      <div className="relative">
        <div className="animate-[wiggle_1.4s_ease-in-out_infinite] rounded-[1.4rem] border-[4px] border-cream bg-chili px-5 py-10 shadow-[0_8px_0_#0d0a08]">
          <div className="mx-auto mb-3 h-1.5 w-8 rounded-full bg-cream/40" />
          <div className="grid size-14 place-items-center rounded-xl bg-cream/20 text-3xl">🏙️</div>
        </div>
        <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-4xl text-amber-300">↻</span>
      </div>

      <div className="relative max-w-xs rounded-2xl border-[3px] border-ink bg-cream px-5 py-3 shadow-[0_6px_0_#0d0a08]">
        <p className="text-lg font-extrabold text-ink">{tr.title}</p>
        <p className="mt-1 text-sm font-bold text-ink/65">{tr.sub}</p>
      </div>
    </div>
  );
}

/** Best-effort landscape lock after a user gesture (Android). iOS ignores — LandscapeGate covers it. */
export function requestLandscape() {
  const el = document.documentElement;
  if (!el.requestFullscreen || !matchMedia("(pointer: coarse)").matches) return;
  el.requestFullscreen()
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
    .catch(() => {});
}
