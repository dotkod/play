"use client";

/**
 * Square intro video (1080 × 1080, 30 fps, ~15 s), rendered frame by frame from the live
 * city and encoded in the browser (WebCodecs H.264 + mp4-muxer). Captions are drawn on a 2D
 * canvas over each 3D frame. The capture script collects the MP4 via `window.__promoSave`.
 */

import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { useEffect, useRef, useState } from "react";
import { ANNE, ANNE_CX, cameraAt, insideShop, type Key, servingView, setTimeOfDay } from "./scene";
import { bridge, PromoCity } from "./stage";

const SIZE = 1080;
const FPS = 30;
const DURATION = 15;

type Shot = { from: number; to: number; day: number; inside?: boolean; keys: Key[] };

function storyboard(): Shot[] {
  const v = servingView();
  const z0 = ANNE.rect.minZ;
  return [
    // A: golden-hour aerial over Pusat Lepak
    {
      from: 0,
      to: 3.4,
      day: 0.62,
      keys: [
        { t: 0, pos: [ANNE_CX - 60, 46, z0 - 62], look: [4, 0, -4] },
        { t: 3.4, pos: [ANNE_CX - 34, 34, z0 - 44], look: [14, 0, -8] },
      ],
    },
    // B: street level along the road, traffic and riders passing
    {
      from: 3.4,
      to: 6.6,
      day: 0.5,
      keys: [
        // Over the road's centre line, above the traffic and clear of lamp arms
        { t: 3.4, pos: [-6, 4.6, z0 - 8.5], look: [12, 1.2, z0 - 7.5] },
        { t: 6.6, pos: [18, 4.6, z0 - 8.5], look: [36, 1.2, z0 - 7.5] },
      ],
    },
    // C: up to Anne Maju's front, then in to the counter view
    {
      from: 6.6,
      to: 10,
      day: 0.5,
      keys: [
        { t: 6.6, pos: [ANNE_CX, 9, z0 - 18], look: [ANNE_CX, 1.6, z0 + 2] },
        { t: 8.3, pos: [ANNE_CX, 7.6, z0 - 6], look: [ANNE_CX, 1, z0 + 4] },
        { t: 10, pos: [v.pos.x, v.pos.y, v.pos.z], look: [v.look.x, v.look.y, v.look.z] },
      ],
    },
    // D: night falls, lamps and windows on
    {
      from: 10,
      to: 12.8,
      day: 0.875,
      keys: [
        // Low pass down Anne Maju's street: lit windows, lamp pools, traffic lights
        { t: 10, pos: [ANNE_CX - 36, 13, z0 - 24], look: [ANNE_CX - 8, 1, z0 - 4] },
        { t: 12.8, pos: [ANNE_CX - 20, 10, z0 - 20], look: [ANNE_CX + 6, 1, z0 - 4] },
      ],
    },
    // E: end card over the night city
    {
      from: 12.8,
      to: DURATION,
      day: 0.875,
      keys: [
        { t: 12.8, pos: [ANNE_CX - 20, 10, z0 - 20], look: [ANNE_CX + 6, 1, z0 - 4] },
        { t: DURATION, pos: [ANNE_CX - 14, 12, z0 - 22], look: [ANNE_CX + 10, 1, z0 - 4] },
      ],
    },
  ];
}

// ---------- 2D overlay drawing ----------

let FONT = "system-ui, sans-serif";

function stroked(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, stroke: number) {
  g.font = `800 ${size}px ${FONT}`;
  g.lineJoin = "round";
  g.miterLimit = 2;
  g.lineWidth = stroke;
  g.strokeStyle = "#1f1a17";
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

function wordmark(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, rot = -0.07) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(s, s);
  g.textAlign = "center";
  g.textBaseline = "middle";
  stroked(g, "KUALA", 0, -118, 100, "#d8352a", 22);
  stroked(g, "LEPAK", 0, 40, 250, "#fcd34d", 32);
  g.restore();
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Chunky sticker (cream card, ink outline, drop shadow) centred at (cx, cy). */
function sticker(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, bg = "#fbf3e4", fg = "#1f1a17", rot = 0) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.font = `800 ${size}px ${FONT}`;
  const w = g.measureText(text).width + size * 1.3;
  const h = size * 1.75;
  roundRect(g, -w / 2, -h / 2 + 10, w, h, h / 2);
  g.fillStyle = "#1f1a17";
  g.fill();
  roundRect(g, -w / 2, -h / 2, w, h, h / 2);
  g.fillStyle = bg;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = "#1f1a17";
  g.stroke();
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 0, 4);
  g.restore();
}

/** 0..1 pop-in with a little overshoot, starting at `start` seconds. */
function pop(t: number, start: number, dur = 0.35) {
  const k = Math.min(1, Math.max(0, (t - start) / dur));
  return k === 0 ? 0 : 1 + 0.12 * Math.sin(k * Math.PI) * (1 - k) * 2 - (1 - k) * (1 - k) * 0.6;
}

function captions(g: CanvasRenderingContext2D, t: number) {
  // A
  if (t < 3.4) {
    const a = pop(t, 0.25);
    if (a > 0) wordmark(g, SIZE / 2, 300, 0.95 * a);
    const b = pop(t, 1.1);
    if (b > 0) sticker(g, "Bandar 3D ala Malaysia 🇲🇾", SIZE / 2, 560, 46 * b, "#fbf3e4", "#1f1a17", -0.03);
  }
  // B
  if (t >= 3.5 && t < 6.6) {
    const a = pop(t, 3.6);
    if (a > 0) sticker(g, "Jalan raya hidup. Rider merata. 🛵", SIZE / 2, 900, 44 * a, "#fcd34d");
  }
  // C
  if (t >= 6.7 && t < 10) {
    const a = pop(t, 6.8);
    if (a > 0) sticker(g, "Kerja pertama: Anne Maju 🍵", SIZE / 2, 130, 48 * a, "#d8352a", "#ffffff", -0.02);
    const b = pop(t, 8.6);
    if (b > 0) sticker(g, "“Anne, teh tarik kurang manis satu!”", SIZE / 2, 930, 38 * b, "#ffffff", "#1f1a17", 0.02);
  }
  // D
  if (t >= 10.1 && t < 12.8) {
    const a = pop(t, 10.2);
    if (a > 0) sticker(g, "Siang ke malam, ikut jam kau 🌙", SIZE / 2, 900, 44 * a, "#fbf3e4");
  }
  // E
  if (t >= 12.8) {
    const k = Math.min(1, (t - 12.8) / 0.4);
    g.fillStyle = `rgba(31,26,23,${0.55 * k})`;
    g.fillRect(0, 0, SIZE, SIZE);
    const a = pop(t, 12.9);
    if (a > 0) wordmark(g, SIZE / 2, 380, 1.0 * a);
    const b = pop(t, 13.4);
    if (b > 0) sticker(g, "Main percuma: kl.dotkod.com", SIZE / 2, 690, 46 * b, "#fcd34d");
    const c = pop(t, 13.7);
    if (c > 0) sticker(g, "@kualalepak", SIZE / 2, 820, 44 * c, "#1f1a17", "#fbf3e4");
  }
}

/** Ink dip between shots: peaks at each cut. */
function dip(t: number, cuts: number[]) {
  let a = 0;
  for (const c of cuts) a = Math.max(a, 1 - Math.abs(t - c) / 0.22);
  return Math.max(0, a);
}

// ---------- recorder ----------

async function record(onProgress: (k: number) => void) {
  await document.fonts.ready;
  FONT = getComputedStyle(document.body).fontFamily || FONT;
  const b = await bridge();
  const shots = storyboard();
  const cuts = shots.slice(1).map((s) => s.from).filter((c) => c < 12.8);

  const comp = document.createElement("canvas");
  comp.width = SIZE;
  comp.height = SIZE;
  const g = comp.getContext("2d")!;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width: SIZE, height: SIZE, frameRate: FPS }, fastStart: "in-memory" });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error(e),
  });
  const configs = ["avc1.640028", "avc1.4d0028", "avc1.42e028"].map((codec) => ({ codec, width: SIZE, height: SIZE, bitrate: 9_000_000, framerate: FPS }));
  let config = configs[0];
  for (const c of configs) {
    if ((await VideoEncoder.isConfigSupported(c)).supported) {
      config = c;
      break;
    }
  }
  encoder.configure(config);

  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    const shot = shots.find((s) => t >= s.from && t < s.to) ?? shots[shots.length - 1];
    setTimeOfDay(shot.day);
    insideShop(!!shot.inside || (shot.from === 6.6 && t > 8.9));
    const c = cameraAt(shot.keys, t);
    b.camera.fov = 50;
    b.camera.updateProjectionMatrix();
    b.camera.position.copy(c.pos);
    b.camera.lookAt(c.look);
    b.advance(t);

    g.drawImage(b.canvas, 0, 0, SIZE, SIZE);
    captions(g, t);
    const d = dip(t, cuts);
    if (d > 0) {
      g.fillStyle = `rgba(31,26,23,${d})`;
      g.fillRect(0, 0, SIZE, SIZE);
    }
    const frame = new VideoFrame(comp, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    if (i % 15 === 0) onProgress(i / total);
  }
  await encoder.flush();
  muxer.finalize();
  return new Uint8Array(target.buffer);
}

/** Hands the MP4 to the capture script in base64 chunks. */
async function deliver(bytes: Uint8Array) {
  const save = (window as unknown as { __promoSave?: (chunk: string, done: boolean) => Promise<void> }).__promoSave;
  if (!save) return;
  const CH = 1 << 20;
  for (let i = 0; i < bytes.length; i += CH) {
    let s = "";
    const part = bytes.subarray(i, i + CH);
    for (let j = 0; j < part.length; j += 0x8000) s += String.fromCharCode(...part.subarray(j, j + 0x8000));
    await save(btoa(s), i + CH >= bytes.length);
  }
}

export function IntroVideo() {
  const [progress, setProgress] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void record(setProgress).then(async (bytes) => {
      await deliver(bytes);
      (window as unknown as { __promoReady: boolean }).__promoReady = true;
      setProgress(1);
    });
  }, []);
  return (
    <div className="relative h-[1080px] w-[1080px] overflow-hidden">
      <PromoCity />
      <p className="absolute top-2 left-2 rounded bg-black/60 px-2 text-xs text-white">rendering {Math.round(progress * 100)}%</p>
    </div>
  );
}
