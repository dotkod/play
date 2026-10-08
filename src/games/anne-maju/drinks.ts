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

export const LABELS = {
  base: { teh: "Teh", kopi: "Kopi", milo: "Milo", nescafe: "Nescafe" },
  milk: { susu: "Susu pekat", o: "O (tak susu)", c: "C (susu cair)" },
  sugar: { biasa: "Biasa", kurang: "Kurang manis", kosong: "Kosong" },
  temp: { panas: "Panas", ais: "Ais" },
} as const;

// Milo/Nescafe "C" is rare at mamak, condensed milk is already sweet so "kosong" never pairs with susu
export function isValidDrink(d: Drink): boolean {
  if (d.milk === "c" && (d.base === "milo" || d.base === "nescafe")) return false;
  if (d.milk === "susu" && d.sugar === "kosong") return false;
  return true;
}

export function drinkName(d: Drink): string {
  const base = LABELS.base[d.base];
  let name: string;
  if (d.milk === "susu") {
    if (d.temp === "ais") name = `${base} Ais`;
    else if (d.base === "teh" || d.base === "nescafe") name = `${base} Tarik`;
    else if (d.base === "milo") name = "Milo Panas";
    else name = base;
  } else {
    name = `${base} ${d.milk.toUpperCase()}${d.temp === "ais" ? " Ais" : ""}`;
  }
  if (d.sugar === "kurang") name += " Kurang Manis";
  if (d.sugar === "kosong") name += " Kosong";
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

const CALLS = ["Anne", "Boss", "Macha", "Bang", "Adik", "Thambi"];
const ENDS = ["satu!", "satu ya!", "satu, cepat sikit!", "satu lah!", "satu, terima kasih!"];

export function orderPhrase(d: Drink): string {
  return `${pick(CALLS)}, ${drinkName(d).toLowerCase()} ${pick(ENDS)}`;
}

export const WRONG_LINES = [
  "Aiyo, bukan ini saya order la!",
  "Eh boss, salah ni!",
  "Saya cakap lain la anne...",
  "Ini air siapa punya?",
  "Haih, tak dengar ke?",
];

export const LEAVE_LINES = ["Lama sangat, blah dulu!", "Tak apa la, pergi kedai sebelah.", "Order pun tak ambil..."];

export const HAPPY_LINES = ["Terbaik boss!", "Power la anne!", "Ngam!", "Sedap, terima kasih!", "Ini baru betul!"];

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
