"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function read(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

// Per-device best score; storage can be blocked (private mode) so every access is guarded
export function useBestScore(game: string) {
  const key = `dotkod-play:${game}:best`;
  const best = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(key),
    () => 0,
  );

  const submit = useCallback(
    (score: number) => {
      if (score <= read(key)) return;
      try {
        localStorage.setItem(key, String(score));
      } catch {}
      listeners.forEach((l) => l());
    },
    [key],
  );

  return { best, submit };
}
