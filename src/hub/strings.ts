import type { Lang } from "@/shared/lang";

const ms = {
  brand: "Hidup, kerja, lepak.",
  hintDesktop: "WASD / anak panah untuk jalan · klik untuk pergi",
  hintTouch: "Guna joystick atau tap jalan",
  goTo: (name: string) => `Jalan ke ${name} untuk main`,
  enter: "Masuk",
  play: "Main",
  soon: "Akan datang",
  soonBody: "Game ni tengah dibina. Nantikan!",
  you: "KAU",
  loading: "Bandar tengah dibuka...",
  tagline: "Kau baru pindah ke Kuala Lepak. Cari kerja, kenal orang, dan jangan lupa usap Oyen.",
  startCta: "▶ Mula jalan",
  startKey: "atau tekan Enter",
  keysWalk: "jalan",
  keysEnter: "masuk / mula",
  keysClick: "klik untuk pergi",
  madeIn: "Dibuat dengan ❤️ di Malaysia",
  controlsDesktop: "🎮 WASD / anak panah · klik untuk jalan · Enter untuk masuk",
  controlsTouch: "🎮 Joystick atau tap untuk jalan",
  petCat: (name: string) => `Usap ${name}`,
  catLoves: (name: string, n: number) => `${name} suka kau! ❤️ · ${n} kali usap kucing`,
};

type Strings = typeof ms;

const en: Strings = {
  brand: "Live, work, lepak.",
  hintDesktop: "WASD / arrows to walk · click to go there",
  hintTouch: "Use the joystick or tap to walk",
  goTo: (name) => `Walk to ${name} to play`,
  enter: "Enter",
  play: "Play",
  soon: "Coming soon",
  soonBody: "This game is being built. Stay tuned!",
  you: "YOU",
  loading: "Opening the city...",
  tagline: "You just moved to Kuala Lepak. Find work, make friends, and don't forget to pet Oyen.",
  startCta: "▶ Start exploring",
  startKey: "or press Enter",
  keysWalk: "walk",
  keysEnter: "enter / start",
  keysClick: "click to go",
  madeIn: "Made with ❤️ in Malaysia",
  controlsDesktop: "🎮 WASD / arrows · click to walk · Enter to go in",
  controlsTouch: "🎮 Joystick or tap to walk",
  petCat: (name) => `Pet ${name}`,
  catLoves: (name, n) => `${name} loves you! ❤️ · ${n} ${n === 1 ? "cat petted" : "cats petted"}`,
};

export const HUB_STRINGS: Record<Lang, Strings> = { ms, en };
