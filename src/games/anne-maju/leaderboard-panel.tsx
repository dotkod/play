"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "./i18n";
import type { Board } from "./leaderboard";
import { rm } from "./result";

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      if (res.ok) setBoard(await res.json());
    } catch {}
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/scores")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => alive && b && setBoard(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return { board, refresh };
}

type Tab = "today" | "week" | "all";

export function LeaderboardPanel({
  board,
  highlight,
  compact = false,
  initialTab = "week",
  light = false,
}: {
  board: Board | null;
  highlight?: string;
  compact?: boolean;
  initialTab?: Tab;
  /** Inside a cream card (city shop UI) instead of over the dark menu. */
  light?: boolean;
}) {
  const tr = useT();
  const [tab, setTab] = useState<Tab>(initialTab);
  const rows = board?.[tab] ?? [];
  const limit = compact ? 5 : 10;
  const hi = highlight?.replace(/^@/, "").toLowerCase();

  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-3 ${light ? "bg-ink/5 text-ink" : "bg-ink/70 text-cream shadow-[0_5px_0_#1f1a17] backdrop-blur"}`}>
      <div className="flex flex-col gap-1.5">
        {!light && <p className="text-sm font-extrabold">{tr.board}</p>}
        <div className={`grid grid-cols-3 rounded-lg p-0.5 text-[11px] font-bold ${light ? "bg-ink/8" : "bg-cream/15"}`}>
          {(["today", "week", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-1.5 py-0.5 whitespace-nowrap ${tab === t ? "bg-amber-300 text-ink" : light ? "text-ink/60" : "text-cream/70"}`}
            >
              {t === "today" ? tr.today : t === "week" ? tr.week : tr.all}
            </button>
          ))}
        </div>
      </div>
      {!board && <p className={`py-2 text-center text-xs ${light ? "text-ink/50" : "text-cream/60"}`}>{tr.boardLoading}</p>}
      {board && rows.length === 0 && <p className={`py-2 text-center text-xs ${light ? "text-ink/60" : "text-cream/70"}`}>{tr.boardEmpty}</p>}
      <ol className="flex flex-col gap-0.5">
        {rows.slice(0, limit).map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className={`flex items-center gap-2 rounded-lg px-2 py-0.5 text-sm ${
              hi && r.name.toLowerCase() === hi ? "bg-amber-300 font-extrabold text-ink" : ""
            }`}
          >
            <span className="w-5 text-center text-xs font-extrabold">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-bold">@{r.name}</span>
            <span className="font-extrabold tabular-nums">{rm(r.earned)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
