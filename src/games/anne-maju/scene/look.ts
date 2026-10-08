export type Headwear = "short" | "tudung" | "songkok" | "cap" | "uncle";

export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  headwear: Headwear;
  hair: string; // hair, tudung or cap colour
};

const SKINS = ["#f1cba8", "#e2ad84", "#c98d60", "#a96d47", "#87543a"];
const SHIRTS = ["#e8553f", "#f2b33d", "#3f8fd2", "#4cae6e", "#9a63c9", "#f07fa8", "#2e4a7a", "#e7e2d6", "#ff8a3d"];
const PANTS = ["#2a2a33", "#3a4a6b", "#5b4a3a", "#23382c", "#4a4a4a"];
const TUDUNG = ["#f3b6c9", "#9fd1e8", "#c7b2e6", "#f0d28a", "#a8d8b0", "#1f2a44"];
const CAPS = ["#d8352a", "#1f2a44", "#2f8f86", "#f2b33d"];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomLook(): Look {
  const r = Math.random();
  const headwear: Headwear = r < 0.4 ? "short" : r < 0.62 ? "tudung" : r < 0.75 ? "songkok" : r < 0.88 ? "cap" : "uncle";
  const hair =
    headwear === "tudung" ? pick(TUDUNG) : headwear === "cap" ? pick(CAPS) : headwear === "uncle" ? "#e9e6df" : pick(["#1b1714", "#2b2018", "#3a2a1e"]);
  return { skin: pick(SKINS), shirt: pick(SHIRTS), pants: pick(PANTS), headwear, hair };
}

export const ANNE_LOOK: Look = { skin: "#a96d47", shirt: "#f7f5ef", pants: "#1f1f24", headwear: "short", hair: "#141110" };
