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
};

// ---------- Background music ----------
// A short mamak-flavoured loop: tabla-ish drums, bass and a plucked melody in a Phrygian-dominant scale.

const ROOT = 196; // G3
const SCALE = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16]; // semitones
const note = (deg: number, oct = 0) => ROOT * Math.pow(2, (SCALE[((deg % SCALE.length) + SCALE.length) % SCALE.length] + 12 * oct) / 12);

// 32 sixteenth-steps (two bars); -1 = rest
const MELODY = [4, -1, 5, 4, 2, -1, 1, 2, 4, -1, 6, -1, 5, 4, 2, -1, 7, -1, 6, 5, 4, -1, 2, 4, 5, 4, 2, 1, 0, -1, -1, -1];
const BASS = [0, -1, -1, 0, -1, -1, 4, -1, 0, -1, -1, 0, -1, 5, 4, -1];
const DHA = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
const TIN = [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1];

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let bpm = 112;

function scheduleStep(i: number, t: number) {
  if (!ctx || !musicBus) return;
  const at = t - ctx.currentTime;
  const s16 = i % 16;
  if (DHA[s16]) tone(110, 0.22, { type: "sine", vol: 0.5, slideTo: 60, at, bus: musicBus });
  if (TIN[s16]) hiss(0.07, { freq: 3200, q: 4, vol: 0.25, at, bus: musicBus });
  hiss(0.03, { freq: 8000, type: "highpass", vol: 0.07, at, bus: musicBus });
  if (BASS[s16] >= 0) tone(note(BASS[s16], -1), 0.28, { type: "triangle", vol: 0.32, at, bus: musicBus });
  const m = MELODY[i % 32];
  if (m >= 0) {
    tone(note(m, 1), 0.2, { type: "sawtooth", vol: 0.07, at, bus: musicBus });
    tone(note(m, 1) * 2, 0.12, { type: "sine", vol: 0.05, at, bus: musicBus });
  }
}

export const music = {
  start() {
    if (!ctx || timer) return;
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    // Lookahead scheduler keeps timing tight even when the main thread is busy rendering 3D
    timer = setInterval(() => {
      if (!ctx) return;
      while (nextTime < ctx.currentTime + 0.12) {
        scheduleStep(step, nextTime);
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
