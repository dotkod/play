"use client";

import { useSyncExternalStore } from "react";

// One language setting for the whole of Play (hub and every game)
export type Lang = "ms" | "en";

const KEY = "dotkod-play:lang";
const LEGACY_KEY = "anne-maju:lang";
const listeners = new Set<() => void>();
let current: Lang = read();

function read(): Lang {
  try {
    if (typeof localStorage === "undefined") return "ms";
    return (localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)) === "en" ? "en" : "ms";
  } catch {
    return "ms";
  }
}

export function getLang() {
  return current;
}

export function setLang(next: Lang) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
    document.documentElement.lang = next;
  } catch {}
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => "ms",
  );
}
