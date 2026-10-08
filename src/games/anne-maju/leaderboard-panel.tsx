"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "./i18n";
import type { Board } from "./leaderboard";
import { rm } from "./result";

const ID_KEY = "anne-maju:player-id";
const NAME_KEY = "anne-maju:player-name";

function store(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {}
  return null;
}

export function playerId() {
  let id = store(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    store(ID_KEY, id);
  }
  return id;
}

export const savedName = () => store(NAME_KEY) ?? "";

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

export function LeaderboardPanel({ board, highlight, compact = false }: { board: Board | null; highlight?: string; compact?: boolean }) {
  const tr = useT();
  const [tab, setTab] = useState<"week" | "all">("week");
  const rows = board?.[tab] ?? [];
  const limit = compact ? 5 : 10;

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-ink/70 p-3 text-cream shadow-[0_5px_0_#1f1a17] backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold">{tr.board}</p>
        <div className="flex rounded-lg bg-cream/15 p-0.5 text-[11px] font-bold">
          {(["week", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-2 py-0.5 ${tab === t ? "bg-amber-300 text-ink" : "text-cream/70"}`}
            >
              {t === "week" ? tr.week : tr.all}
            </button>
          ))}
        </div>
      </div>
      {!board && <p className="py-2 text-center text-xs text-cream/60">{tr.boardLoading}</p>}
      {board && rows.length === 0 && <p className="py-2 text-center text-xs text-cream/70">{tr.boardEmpty}</p>}
      <ol className="flex flex-col gap-0.5">
        {rows.slice(0, limit).map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className={`flex items-center gap-2 rounded-lg px-2 py-0.5 text-sm ${r.name === highlight ? "bg-amber-300 font-extrabold text-ink" : ""}`}
          >
            <span className="w-5 text-center text-xs font-extrabold">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
            <span className="font-extrabold tabular-nums">{rm(r.earned)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
