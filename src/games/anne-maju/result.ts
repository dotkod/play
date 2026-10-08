export type Result = { earned: number; served: number };

const RANKS = [
  { min: 0, title: "Budak Baru Masuk Kerja", emoji: "🥲" },
  { min: 1500, title: "Pembancuh Amatur", emoji: "🫗" },
  { min: 3000, title: "Anne Senior", emoji: "💪" },
  { min: 5000, title: "Tauke Mamak", emoji: "😎" },
  { min: 7500, title: "Legenda Tarik 24 Jam", emoji: "🏆" },
];

export function rankFor(earnedSen: number) {
  return [...RANKS].reverse().find((r) => earnedSen >= r.min)!;
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
