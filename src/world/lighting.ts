/** City clock + lighting presets. Follows the player's real local time. */

export type LightPresetId = "pagi" | "tengah" | "petang" | "malam";

export type LightPreset = {
  id: LightPresetId;
  bg: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunIntensity: number;
  sunColor: string;
  sunHeight: number;
  windows: boolean;
};

export const PRESETS: Record<LightPresetId, LightPreset> = {
  pagi: {
    id: "pagi",
    bg: "#a8d8ef",
    fog: "#a8d8ef",
    fogNear: 55,
    fogFar: 160,
    hemiSky: "#fff8e8",
    hemiGround: "#9db8a8",
    hemiIntensity: 1.2,
    sunIntensity: 1.8,
    sunColor: "#ffe6b8",
    sunHeight: 14,
    windows: false,
  },
  tengah: {
    id: "tengah",
    bg: "#9fdcd2",
    fog: "#9fdcd2",
    fogNear: 50,
    fogFar: 150,
    hemiSky: "#fffaf0",
    hemiGround: "#9db8a8",
    hemiIntensity: 1.4,
    sunIntensity: 2.2,
    sunColor: "#ffffff",
    sunHeight: 18,
    windows: false,
  },
  petang: {
    id: "petang",
    bg: "#f0b070",
    fog: "#e8a060",
    fogNear: 45,
    fogFar: 140,
    hemiSky: "#ffd4a8",
    hemiGround: "#8a6a58",
    hemiIntensity: 1.1,
    sunIntensity: 1.6,
    sunColor: "#ff9a4a",
    sunHeight: 10,
    windows: false,
  },
  // Readable "blue hour" night: moody colours, but streets and faces stay visible
  malam: {
    id: "malam",
    bg: "#24345a",
    fog: "#24345a",
    fogNear: 45,
    fogFar: 135,
    hemiSky: "#9fb4e6",
    hemiGround: "#3a4562",
    hemiIntensity: 1.05,
    sunIntensity: 0.8,
    sunColor: "#c4d0ff",
    sunHeight: 22,
    windows: true,
  },
};

/** Fraction of local day [0,1). Synced from the device clock. */
export const clock = {
  dayFrac: localDayFrac(),
  running: true,
  /** Dev: keep dayFrac where it was set instead of following the device clock. */
  frozen: false,
};

// Dev only: freeze the time of day from the console, e.g. __klClock.frozen = true; __klClock.dayFrac = 0.5
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __klClock: typeof clock }).__klClock = clock;
}

export function localDayFrac(now = new Date()): number {
  const ms = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000 + now.getMilliseconds();
  return ms / 86400000;
}

/** Pull from the player's real local time (call from the city loop). */
export function syncClockFromDevice() {
  if (!clock.running || clock.frozen) return;
  clock.dayFrac = localDayFrac();
}

/** @deprecated Prefer syncClockFromDevice. */
export function advanceClock() {
  syncClockFromDevice();
}

export function presetForFrac(frac = clock.dayFrac): LightPreset {
  // 5–10 pagi, 10–16 tengah, 16–19 petang, else malam
  const h = frac * 24;
  if (h >= 5 && h < 10) return PRESETS.pagi;
  if (h >= 10 && h < 16) return PRESETS.tengah;
  if (h >= 16 && h < 19) return PRESETS.petang;
  return PRESETS.malam;
}

export function gameClockLabel(frac = clock.dayFrac): string {
  const total = Math.floor(frac * 24 * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}
