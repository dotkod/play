"use client";

import { useSyncExternalStore } from "react";
import { type Lang, t as tables } from "./strings";

export type { Lang } from "./strings";

const KEY = "anne-maju:lang";
const listeners = new Set<() => void>();
let current: Lang = read();

function read(): Lang {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "en" ? "en" : "ms";
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

export function useT() {
  return tables(useLang());
}

export function t(lang: Lang = current) {
  return tables(lang);
}
