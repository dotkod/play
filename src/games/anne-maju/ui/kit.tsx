"use client";

/**
 * Anne Maju UI kit: one look for every card and control (cream card, ink outline, chunky
 * drop shadow, Baloo type), so the shop's HUD reads as part of Kuala Lepak.
 */

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-[3px] border-ink bg-cream text-ink shadow-[0_5px_0_#1f1a17] ${className}`}>{children}</div>;
}

type BtnTone = "amber" | "cream" | "chili" | "ghost";
const TONES: Record<BtnTone, string> = {
  amber: "bg-amber-300 text-ink border-ink shadow-[0_4px_0_#1f1a17]",
  cream: "bg-white text-ink border-ink shadow-[0_4px_0_#1f1a17]",
  chili: "bg-chili text-white border-ink shadow-[0_4px_0_#1f1a17]",
  ghost: "bg-ink/5 text-ink border-transparent",
};

export function Btn({
  children,
  onClick,
  tone = "amber",
  size = "md",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: BtnTone;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const sz = size === "lg" ? "px-5 py-3 text-xl" : size === "md" ? "px-4 py-2.5 text-base" : "px-3 py-1.5 text-sm";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-2xl border-[3px] font-extrabold leading-tight transition active:translate-y-0.5 active:shadow-[0_1px_0_#1f1a17] ${sz} ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Round icon button for the HUD (pause, etc.). */
export function IconBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-cream text-lg shadow-[0_3px_0_#1f1a17] active:translate-y-0.5"
    >
      {children}
    </button>
  );
}

/** Compact stat on the HUD bar: icon, value, optional emphasis. */
export function Chip({ icon, children, tone = "plain", innerRef }: { icon: ReactNode; children: ReactNode; tone?: "plain" | "hot" | "warn"; innerRef?: (el: HTMLSpanElement | null) => void }) {
  const t = tone === "hot" ? "text-chili" : tone === "warn" ? "animate-pulse text-chili" : "text-ink";
  return (
    <span className={`flex items-center gap-1 px-1.5 text-base font-extrabold tabular-nums ${t}`}>
      <span className="text-sm">{icon}</span>
      <span ref={innerRef} className="inline-block">
        {children}
      </span>
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-ink/8 p-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-xl px-2 py-1 text-xs font-extrabold transition ${value === t.id ? "bg-amber-300 text-ink shadow-[0_2px_0_#1f1a17]" : "text-ink/60"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
