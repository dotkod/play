import { type Lang, t } from "./strings";

export const BASES = ["teh", "kopi", "milo", "nescafe"] as const;
export const MILKS = ["susu", "o", "c"] as const;
export const SUGARS = ["biasa", "kurang", "kosong"] as const;
export const TEMPS = ["panas", "ais"] as const;

export type Base = (typeof BASES)[number];
export type Milk = (typeof MILKS)[number];
export type Sugar = (typeof SUGARS)[number];
export type Temp = (typeof TEMPS)[number];

export type Drink = { base: Base; milk: Milk; sugar: Sugar; temp: Temp };
export type Cup = Partial<Drink>;

// Milo/Nescafe "C" is rare at mamak, condensed milk is already sweet so "kosong" never pairs with susu
export function isValidDrink(d: Drink): boolean {
  if (d.milk === "c" && (d.base === "milo" || d.base === "nescafe")) return false;
  if (d.milk === "susu" && d.sugar === "kosong") return false;
  return true;
}

const BASE_NAME: Record<Base, string> = { teh: "Teh", kopi: "Kopi", milo: "Milo", nescafe: "Nescafe" };

// Drink names stay in mamak Malay in both languages; only the sugar note is translated
export function drinkName(d: Drink, lang: Lang = "ms"): string {
  const base = BASE_NAME[d.base];
  let name: string;
  if (d.milk === "susu") {
    if (d.temp === "ais") name = `${base} Ais`;
    else if (d.base === "teh" || d.base === "nescafe") name = `${base} Tarik`;
    else if (d.base === "milo") name = "Milo Panas";
    else name = base;
  } else {
    name = `${base} ${d.milk.toUpperCase()}${d.temp === "ais" ? " Ais" : ""}`;
  }
  if (d.sugar === "kurang") name += ` ${t(lang).sugarKurang}`;
  if (d.sugar === "kosong") name += ` ${t(lang).sugarKosong}`;
  return name;
}

export function sameDrink(a: Cup, b: Drink): boolean {
  return a.base === b.base && a.milk === b.milk && a.sugar === b.sugar && a.temp === b.temp;
}

export function isCupComplete(c: Cup): c is Drink {
  return !!(c.base && c.milk && c.sugar && c.temp);
}

// Price in sen
export function drinkPrice(d: Drink): number {
  const base = { teh: 200, kopi: 200, milo: 280, nescafe: 280 }[d.base];
  const milk = { susu: 20, o: -40, c: 40 }[d.milk];
  const ice = d.temp === "ais" ? 30 : 0;
  return base + milk + ice;
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Difficulty 0..1: early orders lean on the classics, later ones mix in O/C and sugar tweaks
export function randomDrink(difficulty: number): Drink {
  for (;;) {
    const simple = Math.random() > 0.15 + difficulty * 0.55;
    const d: Drink = {
      base: simple ? pick(["teh", "kopi", "milo"] as const) : pick(BASES),
      milk: simple ? "susu" : pick(MILKS),
      sugar: simple && Math.random() < 0.8 ? "biasa" : pick(SUGARS),
      temp: pick(TEMPS),
    };
    if (isValidDrink(d)) return d;
  }
}

// Groups say identical drinks once with a count: "teh tarik dua, milo ais satu"
export function orderPhrase(drinks: Drink[], lang: Lang, seed: number): string {
  const tr = t(lang);
  const counts = new Map<string, number>();
  for (const d of drinks) {
    const name = drinkName(d, lang).toLowerCase();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const items = [...counts].map(([name, n]) => (lang === "ms" ? `${name} ${tr.numbers[n]}` : `${tr.numbers[n]} ${name}`));
  const call = tr.calls[seed % tr.calls.length];
  const end = tr.ends[Math.floor(seed / 7) % tr.ends.length];
  return `${call}, ${items.join(", ")}${end}`;
}

export function randomLine(lines: readonly string[]): string {
  return pick(lines);
}

// Liquid colour for the cup preview
export function cupColor(c: Cup): string {
  if (!c.base) return "transparent";
  const table: Record<Base, Record<Milk, string>> = {
    teh: { susu: "#c9965f", o: "#8f4a17", c: "#b67d48" },
    kopi: { susu: "#8a5a3b", o: "#2a170c", c: "#6f4529" },
    milo: { susu: "#7a4a2e", o: "#4b2817", c: "#7a4a2e" },
    nescafe: { susu: "#9a6943", o: "#3a2213", c: "#9a6943" },
  };
  return table[c.base][c.milk ?? "o"];
}
