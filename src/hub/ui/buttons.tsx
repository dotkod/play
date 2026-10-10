"use client";

import { setMuted, unlockAudio, useMuted } from "@/shared/audio";

// Round thumb-sized action with a label chip on its left
export function ActionButton({
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

export function MuteButton() {
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

