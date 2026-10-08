import { pick, rand } from "@/shared/rng";

export type Headwear = "short" | "tudung" | "songkok" | "cap" | "uncle" | "long" | "bun" | "ponytail";

export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  headwear: Headwear;
  hair: string; // hair, tudung or cap colour
  kid?: boolean;
  dress?: boolean; // baju kurung style long top
  glasses?: boolean; // sunglasses (outfit)
  apron?: string; // apron colour (outfit)
  carry?: Carry; // something in the right hand
};

export type Carry = "briefcase" | "bag" | "umbrella";

const SKINS = ["#f1cba8", "#e2ad84", "#c98d60", "#a96d47", "#87543a"];
const SHIRTS = ["#e8553f", "#f2b33d", "#3f8fd2", "#4cae6e", "#9a63c9", "#f07fa8", "#2e4a7a", "#e7e2d6", "#ff8a3d"];
const KURUNG = ["#f3b6c9", "#9fd1e8", "#c7b2e6", "#f0d28a", "#a8d8b0", "#f7a58a"];
const PANTS = ["#2a2a33", "#3a4a6b", "#5b4a3a", "#23382c", "#4a4a4a"];
const TUDUNG = ["#f3b6c9", "#9fd1e8", "#c7b2e6", "#f0d28a", "#a8d8b0", "#1f2a44", "#ffffff"];
const CAPS = ["#d8352a", "#1f2a44", "#2f8f86", "#f2b33d"];
const HAIR = ["#1b1714", "#2b2018", "#3a2a1e"];


export type Kind = "man" | "woman" | "kid";

export function randomLook(kind: Kind = pick(["man", "man", "woman", "woman"] as const)): Look {
  const skin = pick(SKINS);
  if (kind === "kid") {
    const girl = rand() < 0.5;
    return { skin, shirt: pick(SHIRTS), pants: pick(PANTS), headwear: girl ? pick(["ponytail", "tudung"] as const) : "short", hair: girl && rand() < 0.4 ? pick(TUDUNG) : pick(HAIR), kid: true };
  }
  if (kind === "woman") {
    const headwear = pick(["tudung", "tudung", "long", "bun"] as const);
    const kurung = rand() < 0.5;
    return {
      skin,
      shirt: kurung ? pick(KURUNG) : pick(SHIRTS),
      pants: kurung ? pick(KURUNG) : pick(PANTS),
      headwear,
      hair: headwear === "tudung" ? pick(TUDUNG) : pick(HAIR),
      dress: kurung,
    };
  }
  const r = rand();
  const headwear: Headwear = r < 0.5 ? "short" : r < 0.68 ? "songkok" : r < 0.85 ? "cap" : "uncle";
  const hair = headwear === "cap" ? pick(CAPS) : headwear === "uncle" ? "#e9e6df" : pick(HAIR);
  return { skin, shirt: pick(SHIRTS), pants: pick(PANTS), headwear, hair };
}

// City pedestrians: a wider cast than the mamak diners (kept separate so game spawns stay unchanged)
export type Townsfolk = "office" | "student" | "auntie" | "jogger" | "elder" | "umbrella" | "kid";

export function townsfolk(kind: Townsfolk): Look {
  const skin = pick(SKINS);
  switch (kind) {
    case "office":
      return { skin, shirt: pick(["#f4f6f8", "#cfe0f2", "#e7e2d6"]), pants: "#2a2a33", headwear: rand() < 0.3 ? "long" : "short", hair: pick(HAIR), carry: "briefcase" };
    case "student": {
      // Sekolah: white shirt, dark trousers; girls in blue baju kurung with a white tudung
      const girl = rand() < 0.5;
      return girl
        ? { skin, shirt: "#3f6fb5", pants: "#3f6fb5", headwear: "tudung", hair: "#ffffff", dress: true, kid: true }
        : { skin, shirt: "#ffffff", pants: pick(["#1f2a44", "#23382c"]), headwear: "short", hair: pick(HAIR), kid: true };
    }
    case "auntie":
      return { skin, shirt: pick(KURUNG), pants: pick(KURUNG), headwear: rand() < 0.6 ? "tudung" : "bun", hair: pick(TUDUNG), dress: true, carry: "bag" };
    case "jogger":
      return { skin, shirt: pick(["#ff8a3d", "#3f8fd2", "#e8553f", "#1f1f24"]), pants: "#1f1f24", headwear: "cap", hair: pick(CAPS) };
    case "elder":
      return { skin, shirt: pick(["#e7e2d6", "#9fd1e8", "#c7b2e6"]), pants: "#5b4a3a", headwear: "uncle", hair: "#e9e6df" };
    case "umbrella":
      return { ...randomLook(), carry: "umbrella" };
    case "kid":
      return randomLook("kid");
  }
}

// A party's members: solo diner, couple, friends, or a parent with a kid
export function randomParty(size: number): Look[] {
  if (size === 1) return [randomLook()];
  if (size >= 2 && rand() < 0.4) {
    const parent = randomLook(rand() < 0.5 ? "woman" : "man");
    return [parent, ...Array.from({ length: size - 1 }, () => randomLook(rand() < 0.6 ? "kid" : undefined))];
  }
  return Array.from({ length: size }, () => randomLook());
}

export const ANNE_LOOK: Look = { skin: "#a96d47", shirt: "#f7f5ef", pants: "#1f1f24", headwear: "short", hair: "#141110" };
