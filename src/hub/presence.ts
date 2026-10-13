"use client";

/**
 * Online heartbeat for the city HUD. While the tab is visible and signed in it pings
 * /api/presence every 30 s and keeps the latest { total, online }. Hiding or closing the
 * tab signs off with a beacon so "online now" drops right away.
 */

import { useEffect, useState } from "react";

export type PlayerCounts = { total: number; online: number };

const PING_MS = 30_000;

async function ping(): Promise<PlayerCounts | null> {
  try {
    const res = await fetch("/api/presence", { method: "POST", body: "{}" });
    if (!res.ok) return null;
    return (await res.json()) as PlayerCounts;
  } catch {
    return null;
  }
}

function signOff() {
  navigator.sendBeacon?.("/api/presence", JSON.stringify({ away: true }));
}

export function usePlayerCounts(username: string | null): PlayerCounts | null {
  const [counts, setCounts] = useState<PlayerCounts | null>(null);
  useEffect(() => {
    if (!username) return;
    let live = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const beat = () =>
      void ping().then((c) => {
        if (live && c) setCounts(c);
      });
    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, PING_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else {
        stop();
        signOff();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", signOff);
    return () => {
      live = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", signOff);
    };
  }, [username]);
  return username ? counts : null;
}
