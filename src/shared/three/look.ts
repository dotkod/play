export type Headwear = "short" | "tudung" | "songkok" | "cap" | "uncle" | "long" | "bun" | "ponytail";

export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  headwear: Headwear;
  hair: string; // hair, tudung or cap colour
  kid?: boolean;
  dress?: boolean; // baju kurung style long top
};

const SKINS = ["#f1cba8", "#e2ad84", "#c98d60", "#a96d47", "#87543a"];
const SHIRTS = ["#e8553f", "#f2b33d", "#3f8fd2", "#4cae6e", "#9a63c9", "#f07fa8", "#2e4a7a", "#e7e2d6", "#ff8a3d"];
const KURUNG = ["#f3b6c9", "#9fd1e8", "#c7b2e6", "#f0d28a", "#a8d8b0", "#f7a58a"];
const PANTS = ["#2a2a33", "#3a4a6b", "#5b4a3a", "#23382c", "#4a4a4a"];
const TUDUNG = ["#f3b6c9", "#9fd1e8", "#c7b2e6", "#f0d28a", "#a8d8b0", "#1f2a44", "#ffffff"];
const CAPS = ["#d8352a", "#1f2a44", "#2f8f86", "#f2b33d"];
const HAIR = ["#1b1714", "#2b2018", "#3a2a1e"];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export type Kind = "man" | "woman" | "kid";

export function randomLook(kind: Kind = pick(["man", "man", "woman", "woman"] as const)): Look {
  const skin = pick(SKINS);
  if (kind === "kid") {
    const girl = Math.random() < 0.5;
    return { skin, shirt: pick(SHIRTS), pants: pick(PANTS), headwear: girl ? pick(["ponytail", "tudung"] as const) : "short", hair: girl && Math.random() < 0.4 ? pick(TUDUNG) : pick(HAIR), kid: true };
  }
  if (kind === "woman") {
    const headwear = pick(["tudung", "tudung", "long", "bun"] as const);
    const kurung = Math.random() < 0.5;
    return {
      skin,
      shirt: kurung ? pick(KURUNG) : pick(SHIRTS),
      pants: kurung ? pick(KURUNG) : pick(PANTS),
      headwear,
      hair: headwear === "tudung" ? pick(TUDUNG) : pick(HAIR),
      dress: kurung,
    };
  }
  const r = Math.random();
  const headwear: Headwear = r < 0.5 ? "short" : r < 0.68 ? "songkok" : r < 0.85 ? "cap" : "uncle";
  const hair = headwear === "cap" ? pick(CAPS) : headwear === "uncle" ? "#e9e6df" : pick(HAIR);
  return { skin, shirt: pick(SHIRTS), pants: pick(PANTS), headwear, hair };
}

// A party's members: solo diner, couple, friends, or a parent with a kid
export function randomParty(size: number): Look[] {
  if (size === 1) return [randomLook()];
  if (size >= 2 && Math.random() < 0.4) {
    const parent = randomLook(Math.random() < 0.5 ? "woman" : "man");
    return [parent, ...Array.from({ length: size - 1 }, () => randomLook(Math.random() < 0.6 ? "kid" : undefined))];
  }
  return Array.from({ length: size }, () => randomLook());
}

export const ANNE_LOOK: Look = { skin: "#a96d47", shirt: "#f7f5ef", pants: "#1f1f24", headwear: "short", hair: "#141110" };
