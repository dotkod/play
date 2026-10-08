"use client";

import type { Base, Menu, Milk, Sugar } from "./drinks";
import type { Look } from "@/shared/three/look";

// Per-device progress: career earnings unlock menu items and outfits for Anne

const CAREER_KEY = "anne-maju:career";
const TUTORIAL_KEY = "anne-maju:tutorial-done";
export const OUTFIT_KEY = "dotkod-play:outfit";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export const career = () => Number(read(CAREER_KEY)) || 0;
export function addCareer(sen: number) {
  const next = career() + sen;
  write(CAREER_KEY, String(next));
  return next;
}

export const tutorialDone = () => read(TUTORIAL_KEY) === "1";
export const markTutorialDone = () => write(TUTORIAL_KEY, "1");

// ---------- Menu unlocks ----------

export type Unlock = { at: number; bases?: Base[]; milks?: Milk[]; sugars?: Sugar[]; key: string };

// Thresholds are career RM in sen
export const UNLOCKS: Unlock[] = [
  { at: 0, bases: ["teh", "kopi", "milo"], milks: ["susu", "o"], sugars: ["biasa", "kurang"], key: "start" },
  { at: 3000, bases: ["nescafe"], sugars: ["kosong"], key: "nescafe" },
  { at: 8000, milks: ["c"], key: "c" },
];

export function menuFor(careerSen: number): Menu {
  const got = UNLOCKS.filter((u) => careerSen >= u.at);
  return {
    bases: got.flatMap((u) => u.bases ?? []),
    milks: got.flatMap((u) => u.milks ?? []),
    sugars: got.flatMap((u) => u.sugars ?? []),
  };
}

// Unlocks crossed by going from `before` to `after`
export const newUnlocks = (before: number, after: number) => UNLOCKS.filter((u) => u.at > before && u.at <= after);
export const nextUnlock = (careerSen: number) => UNLOCKS.find((u) => u.at > careerSen) ?? null;

// ---------- Outfits for Anne (also worn by your character in the city) ----------

export type Outfit = { id: string; at: number; emoji: string; look: Partial<Look> };

export const OUTFITS: Outfit[] = [
  { id: "basic", at: 0, emoji: "👕", look: {} },
  { id: "cap", at: 2000, emoji: "🧢", look: { headwear: "cap", hair: "#d8352a" } },
  { id: "songkok", at: 6000, emoji: "🎩", look: { headwear: "songkok" } },
  { id: "shades", at: 12000, emoji: "🕶️", look: { glasses: true } },
  { id: "apron", at: 20000, emoji: "🧑‍🍳", look: { apron: "#2f8f86", headwear: "cap", hair: "#ffffff" } },
];

export const unlockedOutfits = (careerSen: number) => OUTFITS.filter((o) => careerSen >= o.at);
export const currentOutfit = () => OUTFITS.find((o) => o.id === read(OUTFIT_KEY)) ?? OUTFITS[0];
export const setOutfit = (id: string) => write(OUTFIT_KEY, id);

// ---------- Daily shift ----------

// Malaysia date, e.g. "2026-10-08"; the same everywhere at the same moment
export function dailyKey(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
