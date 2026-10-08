export type Result = { earned: number; served: number };

import { type Lang, t } from "./strings";

const RANKS = [
  { min: 0, emoji: "🥲" },
  { min: 1500, emoji: "🫗" },
  { min: 3000, emoji: "💪" },
  { min: 5000, emoji: "😎" },
  { min: 7500, emoji: "🏆" },
];

export function rankFor(earnedSen: number, lang: Lang = "ms") {
  const i = RANKS.findLastIndex((r) => earnedSen >= r.min);
  return { ...RANKS[i], title: t(lang).ranks[i] };
}

export const rm = (sen: number) => `RM${(sen / 100).toFixed(2)}`;

// Share URLs look like /anne-maju/k/4720-12; only digits so OG images can't render arbitrary text
export function encodeResult(r: Result): string {
  return `${r.earned}-${r.served}`;
}

export function decodeResult(code: string): Result | null {
  const m = /^(\d{1,5})-(\d{1,3})$/.exec(code);
  if (!m) return null;
  return { earned: Number(m[1]), served: Number(m[2]) };
}
