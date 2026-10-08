"use client";

import { useSyncExternalStore } from "react";

// Everything is synthesized with Web Audio: no files to download, tiny bundle, instant start.

const MUTE_KEY = "dotkod-play:muted";
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = readMuted();

function readMuted() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

// Browsers only allow audio after a user gesture, so call this from a click handler
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {}
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.05);
  listeners.forEach((l) => l());
}

export function useMuted() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
    () => false,
  );
}

// ---------- Building blocks ----------

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slideTo?: number; bus?: GainNode | null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + (opts.at ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(opts.bus ?? sfxBus!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function hiss(dur: number, opts: { at?: number; vol?: number; freq?: number; freqTo?: number; q?: number; type?: BiquadFilterType; bus?: GainNode | null } = {}) {
  if (!ctx || !noise) return;
  const t = ctx.currentTime + (opts.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.setValueAtTime(opts.freq ?? 1200, t);
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + dur);
  f.Q.value = opts.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(opts.bus ?? sfxBus!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

// ---------- Sound effects ----------

export const sfx = {
  tap: () => tone(520, 0.08, { slideTo: 300, vol: 0.25 }),
  clink: () => {
    tone(2400, 0.25, { type: "triangle", vol: 0.12 });
    tone(3300, 0.2, { type: "sine", vol: 0.08, at: 0.02 });
  },
  pour: () => {
    hiss(0.55, { freq: 500, freqTo: 1400, q: 2, vol: 0.28, at: 0.2 });
    tone(180, 0.4, { type: "sine", vol: 0.06, at: 0.25, slideTo: 260 });
  },
  sugar: () => {
    for (let i = 0; i < 4; i++) hiss(0.05, { freq: 5000, q: 3, vol: 0.18, at: 0.25 + i * 0.06 });
  },
  arrive: () => {
    tone(988, 0.5, { type: "sine", vol: 0.16 });
    tone(784, 0.6, { type: "sine", vol: 0.16, at: 0.16 });
  },
  correct: () => {
    // Cha-ching: bell plus coins
    tone(1046, 0.25, { type: "triangle", vol: 0.22 });
    tone(1568, 0.35, { type: "triangle", vol: 0.2, at: 0.08 });
    for (let i = 0; i < 5; i++) tone(2600 + Math.random() * 900, 0.08, { type: "square", vol: 0.04, at: 0.16 + i * 0.045 });
  },
  wrong: () => {
    tone(160, 0.32, { type: "square", vol: 0.12, slideTo: 110 });
    tone(150, 0.32, { type: "sawtooth", vol: 0.06, slideTo: 100 });
  },
  walkout: () => {
    tone(392, 0.18, { type: "triangle", vol: 0.15 });
    tone(330, 0.18, { type: "triangle", vol: 0.15, at: 0.14 });
    tone(262, 0.35, { type: "triangle", vol: 0.15, at: 0.28 });
  },
  tick: () => tone(1800, 0.04, { type: "square", vol: 0.06 }),
  start: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { type: "triangle", vol: 0.18, at: i * 0.08 })),
  over: () => [784, 659, 523, 392, 523].forEach((f, i) => tone(f, i === 4 ? 0.6 : 0.2, { type: "triangle", vol: 0.2, at: i * 0.14 })),
  record: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.22, { type: "triangle", vol: 0.18, at: i * 0.07 })),
  // City
  step: (alt: boolean) => hiss(0.06, { freq: alt ? 380 : 320, type: "lowpass", vol: 0.12 }),
  chime: () => {
    tone(1318, 0.5, { type: "sine", vol: 0.1 });
    tone(1760, 0.6, { type: "sine", vol: 0.08, at: 0.1 });
  },
  doorbell: () => {
    tone(784, 0.7, { type: "sine", vol: 0.18 });
    tone(622, 0.9, { type: "sine", vol: 0.18, at: 0.32 });
  },
  horn: () => {
    tone(420, 0.22, { type: "square", vol: 0.07 });
    tone(525, 0.22, { type: "square", vol: 0.06 });
    tone(420, 0.3, { type: "square", vol: 0.07, at: 0.28 });
    tone(525, 0.3, { type: "square", vol: 0.06, at: 0.28 });
  },
};

// ---------- Background music ----------
// Two loops: the mamak shop (tabla-ish drums, Phrygian-dominant pluck) and the city (laid-back pentatonic keys).

type Track = "mamak" | "city";

const note = (root: number, scale: number[], deg: number, oct = 0) =>
  root * Math.pow(2, (scale[((deg % scale.length) + scale.length) % scale.length] + 12 * oct) / 12);

const MAMAK = {
  root: 196, // G3
  scale: [0, 1, 4, 5, 7, 8, 10, 12, 13, 16],
  bpm: 112,
  // 32 sixteenth-steps (two bars); -1 = rest
  melody: [4, -1, 5, 4, 2, -1, 1, 2, 4, -1, 6, -1, 5, 4, 2, -1, 7, -1, 6, 5, 4, -1, 2, 4, 5, 4, 2, 1, 0, -1, -1, -1],
  bass: [0, -1, -1, 0, -1, -1, 4, -1, 0, -1, -1, 0, -1, 5, 4, -1],
};
const DHA = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
const TIN = [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1];

const CITY = {
  root: 220, // A3
  scale: [0, 2, 4, 7, 9, 12, 14, 16],
  bpm: 92,
  melody: [4, -1, -1, 3, 2, -1, 3, -1, 4, -1, 5, -1, 4, -1, -1, -1, 2, -1, -1, 1, 0, -1, 1, -1, 2, -1, 3, 2, 1, -1, -1, -1],
  bass: [0, -1, -1, -1, 0, -1, 3, -1, 4, -1, -1, -1, 3, -1, 1, -1],
  chords: [
    [0, 2, 4],
    [3, 5, 7],
    [4, 6, 1],
    [3, 5, 0],
  ],
};

let track: Track = "mamak";
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let bpm = MAMAK.bpm;

function scheduleMamak(i: number, at: number) {
  const s16 = i % 16;
  if (DHA[s16]) tone(110, 0.22, { type: "sine", vol: 0.5, slideTo: 60, at, bus: musicBus });
  if (TIN[s16]) hiss(0.07, { freq: 3200, q: 4, vol: 0.25, at, bus: musicBus });
  hiss(0.03, { freq: 8000, type: "highpass", vol: 0.07, at, bus: musicBus });
  if (MAMAK.bass[s16] >= 0) tone(note(MAMAK.root, MAMAK.scale, MAMAK.bass[s16], -1), 0.28, { type: "triangle", vol: 0.32, at, bus: musicBus });
  const m = MAMAK.melody[i % 32];
  if (m >= 0) {
    const f = note(MAMAK.root, MAMAK.scale, m, 1);
    tone(f, 0.2, { type: "sawtooth", vol: 0.07, at, bus: musicBus });
    tone(f * 2, 0.12, { type: "sine", vol: 0.05, at, bus: musicBus });
  }
}

function scheduleCity(i: number, at: number) {
  const s16 = i % 16;
  // Soft shaker on the off-beats and a gentle kick on 1 and 3
  if (s16 % 2 === 1) hiss(0.04, { freq: 7000, type: "highpass", vol: 0.05, at, bus: musicBus });
  if (s16 === 0 || s16 === 8) tone(90, 0.25, { type: "sine", vol: 0.35, slideTo: 50, at, bus: musicBus });
  if (CITY.bass[s16] >= 0) tone(note(CITY.root, CITY.scale, CITY.bass[s16], -1), 0.4, { type: "triangle", vol: 0.28, at, bus: musicBus });
  // Electric-piano style chord stabs each bar
  if (s16 === 0 || s16 === 10) {
    const chord = CITY.chords[Math.floor(i / 16) % CITY.chords.length];
    chord.forEach((d) => tone(note(CITY.root, CITY.scale, d), 0.9, { type: "sine", vol: 0.06, at, bus: musicBus }));
  }
  const m = CITY.melody[i % 32];
  if (m >= 0) {
    const f = note(CITY.root, CITY.scale, m, 1);
    tone(f, 0.35, { type: "triangle", vol: 0.08, at, bus: musicBus });
    tone(f * 3, 0.12, { type: "sine", vol: 0.015, at, bus: musicBus });
  }
}

export const music = {
  // Switching tracks restarts the loop; starting the same track again is a no-op
  start(next: Track = "mamak") {
    if (!ctx) return;
    if (timer && track === next) return;
    music.stop();
    track = next;
    bpm = next === "city" ? CITY.bpm : MAMAK.bpm;
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    // Lookahead scheduler keeps timing tight even when the main thread is busy rendering 3D
    timer = setInterval(() => {
      if (!ctx || !musicBus) return;
      while (nextTime < ctx.currentTime + 0.12) {
        const at = nextTime - ctx.currentTime;
        if (track === "city") scheduleCity(step, at);
        else scheduleMamak(step, at);
        nextTime += 60 / bpm / 4;
        step++;
      }
    }, 25);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  },
  setTempo(next: number) {
    bpm = next;
  },
};

// True once the user has interacted and audio is allowed (e.g. coming back from a game)
export function audioReady() {
  return !!ctx && ctx.state === "running";
}

// ---------- City ambience ----------
// Constant traffic rumble, an engine tone that swells as vehicles pass nearby, and birds now and then.

let rumble: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let engine: { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
let birds: ReturnType<typeof setTimeout> | null = null;

function chirp() {
  const base = 2600 + Math.random() * 1400;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) tone(base, 0.09, { type: "sine", vol: 0.035, slideTo: base * 1.35, at: i * 0.13 });
  birds = setTimeout(chirp, 3000 + Math.random() * 5000);
}

export const ambience = {
  start() {
    if (!ctx || !noise || !sfxBus || rumble) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    src.connect(lp).connect(gain).connect(sfxBus);
    src.start();
    rumble = { src, gain };

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 70;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    const eg = ctx.createGain();
    eg.gain.value = 0;
    osc.connect(filter).connect(eg).connect(sfxBus);
    osc.start();
    engine = { osc, filter, gain: eg };

    birds = setTimeout(chirp, 1500);
  },
  stop() {
    rumble?.src.stop();
    engine?.osc.stop();
    rumble = null;
    engine = null;
    if (birds) clearTimeout(birds);
    birds = null;
  },
  // level 0..1 = how close the nearest vehicle is; bikes buzz higher than cars
  setEngine(level: number, bike: boolean) {
    if (!ctx || !engine) return;
    const t = ctx.currentTime;
    engine.gain.gain.setTargetAtTime(level * 0.09, t, 0.12);
    engine.osc.frequency.setTargetAtTime((bike ? 120 : 62) + level * (bike ? 60 : 25), t, 0.15);
    engine.filter.frequency.setTargetAtTime(bike ? 1100 : 420, t, 0.2);
  },
};
