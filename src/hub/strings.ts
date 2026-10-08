import type { Lang } from "@/shared/lang";

const ms = {
  brand: "Game 3D Malaysia",
  hintDesktop: "WASD / anak panah untuk jalan · klik untuk pergi",
  hintTouch: "Guna joystick atau tap jalan",
  goTo: (name: string) => `Jalan ke ${name} untuk main`,
  enter: "Masuk",
  play: "Main",
  soon: "Akan datang",
  soonBody: "Game ni tengah dibina. Nantikan!",
  you: "KAU",
  loading: "Bandar tengah dibuka...",
};

type Strings = typeof ms;

const en: Strings = {
  brand: "Malaysian 3D games",
  hintDesktop: "WASD / arrows to walk · click to go there",
  hintTouch: "Use the joystick or tap to walk",
  goTo: (name) => `Walk to ${name} to play`,
  enter: "Enter",
  play: "Play",
  soon: "Coming soon",
  soonBody: "This game is being built. Stay tuned!",
  you: "YOU",
  loading: "Opening the city...",
};

export const HUB_STRINGS: Record<Lang, Strings> = { ms, en };
