/**
 * Live KL atmosphere — weather + jerebu. Module state read by lighting / rain / HUD.
 * Fetched via /api/atmosphere (Open-Meteo + WAQI); never call those APIs from the client.
 */

export type WeatherKind = "clear" | "cloud" | "rain" | "storm";
export type HazeKind = "none" | "light" | "heavy";

export type AtmosphereSnapshot = {
  weather: WeatherKind;
  aqi: number | null;
  haze: HazeKind;
  tempC: number | null;
  updatedAt: number;
  source: "live" | "fallback";
};

export const atmosphere: AtmosphereSnapshot = {
  weather: "clear",
  aqi: null,
  haze: "none",
  tempC: null,
  updatedAt: 0,
  source: "fallback",
};

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeAtmosphere(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function getAtmosphere() {
  return atmosphere;
}

export function setAtmosphere(next: AtmosphereSnapshot) {
  atmosphere.weather = next.weather;
  atmosphere.aqi = next.aqi;
  atmosphere.haze = next.haze;
  atmosphere.tempC = next.tempC;
  atmosphere.updatedAt = next.updatedAt;
  atmosphere.source = next.source;
  notify();
}

export function hazeFromAqi(aqi: number | null): HazeKind {
  if (aqi == null || Number.isNaN(aqi)) return "none";
  if (aqi >= 150) return "heavy";
  if (aqi >= 80) return "light";
  return "none";
}

/** WMO weather_code → coarse bucket. */
export function weatherFromCode(code: number, precipMm: number): WeatherKind {
  if (code >= 95) return "storm";
  if ((code >= 80 && code <= 82) || precipMm >= 2.5) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 99) || precipMm >= 0.2) return "rain";
  if (code >= 1 && code <= 3) return "cloud";
  return "clear";
}

export type LightMod = {
  fogNear: number;
  fogFar: number;
  fog: string;
  bg: string;
  sunIntensity: number;
  hemiIntensity: number;
};

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

/** Blend day/night preset with live weather + haze. */
export function lightModFor(
  base: { fogNear: number; fogFar: number; fog: string; bg: string; sunIntensity: number; hemiIntensity: number },
  snap: AtmosphereSnapshot = atmosphere,
): LightMod {
  let { fogNear, fogFar, fog, bg, sunIntensity, hemiIntensity } = base;

  if (snap.haze === "light") {
    fogNear *= 0.72;
    fogFar *= 0.62;
    fog = mixHex(fog, "#c4b48a", 0.55);
    bg = mixHex(bg, "#b8a878", 0.35);
    sunIntensity *= 0.72;
    hemiIntensity *= 0.85;
  } else if (snap.haze === "heavy") {
    fogNear *= 0.45;
    fogFar *= 0.38;
    fog = mixHex(fog, "#9a8868", 0.75);
    bg = mixHex(bg, "#8a7a58", 0.55);
    sunIntensity *= 0.4;
    hemiIntensity *= 0.65;
  }

  if (snap.weather === "cloud") {
    fogFar *= 0.9;
    sunIntensity *= 0.85;
    bg = mixHex(bg, "#8aa0a8", 0.25);
  } else if (snap.weather === "rain") {
    fogNear *= 0.7;
    fogFar *= 0.65;
    fog = mixHex(fog, "#6a7a88", 0.55);
    bg = mixHex(bg, "#5a6a78", 0.45);
    sunIntensity *= 0.55;
    hemiIntensity *= 0.8;
  } else if (snap.weather === "storm") {
    fogNear *= 0.55;
    fogFar *= 0.5;
    fog = mixHex(fog, "#4a5560", 0.7);
    bg = mixHex(bg, "#3a4550", 0.6);
    sunIntensity *= 0.35;
    hemiIntensity *= 0.7;
  }

  return { fogNear, fogFar, fog, bg, sunIntensity, hemiIntensity };
}

const POLL_MS = 12 * 60 * 1000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export async function refreshAtmosphere() {
  try {
    const res = await fetch("/api/atmosphere", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as AtmosphereSnapshot;
    setAtmosphere(data);
  } catch {
    if (atmosphere.source === "live") return;
    setAtmosphere({
      weather: "clear",
      aqi: null,
      haze: "none",
      tempC: null,
      updatedAt: Date.now(),
      source: "fallback",
    });
  }
}

/** Start polling (idempotent). Call once when the city hub mounts. */
export function startAtmospherePolling() {
  void refreshAtmosphere();
  if (pollTimer) return;
  pollTimer = setInterval(() => void refreshAtmosphere(), POLL_MS);
}
