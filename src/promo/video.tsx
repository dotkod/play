"use client";

/**
 * Square intro video (1080 × 1080, 30 fps, ~15 s), rendered frame by frame from the live
 * city and encoded in the browser (WebCodecs H.264 + mp4-muxer). Captions are drawn on a 2D
 * canvas over each 3D frame. The capture script collects the MP4 via `window.__promoSave`.
 */

import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { TRACK_Z } from "@/lrt/plan/constants";
import { getShuttle, tickShuttle } from "@/lrt/sim/shuttle";
import { ANNE, ANNE_CX, cameraAt, insideShop, type Key, servingView, setTimeOfDay } from "./scene";
import { bridge, PromoCity } from "./stage";

const SIZE = 1080;
const FPS = 30;
const DURATION = 24;

type Shot = { from: number; to: number; day: number; inside?: boolean; keys: Key[] };

/** When each segment starts (seconds). */
const T = { street: 3, lrt: 5.6, anne: 8.8, night: 12, soon: 14, end: 20.5 };

function storyboard(): Shot[] {
  const v = servingView();
  const z0 = ANNE.rect.minZ;
  return [
    // Golden-ish aerial over Pusat Lepak with the logo
    {
      from: 0,
      to: T.street,
      day: 0.62,
      keys: [
        { t: 0, pos: [ANNE_CX - 60, 46, z0 - 62], look: [4, 0, -4] },
        { t: T.street, pos: [ANNE_CX - 36, 35, z0 - 46], look: [14, 0, -8] },
      ],
    },
    // Over the road's centre line, above the traffic and clear of lamp arms
    {
      from: T.street,
      to: T.lrt,
      day: 0.5,
      keys: [
        { t: T.street, pos: [-6, 4.6, z0 - 8.5], look: [12, 1.2, z0 - 7.5] },
        { t: T.lrt, pos: [16, 4.6, z0 - 8.5], look: [34, 1.2, z0 - 7.5] },
      ],
    },
    // The elevated LRT line along the north of the city
    {
      from: T.lrt,
      to: T.anne,
      day: 0.55,
      keys: [
        { t: T.lrt, pos: [-34, 15, TRACK_Z - 20], look: [-6, 7, TRACK_Z] },
        { t: T.anne, pos: [-8, 13, TRACK_Z - 18], look: [16, 7, TRACK_Z] },
      ],
    },
    // Up to Anne Maju's front, then in to the counter view
    {
      from: T.anne,
      to: T.night,
      day: 0.5,
      keys: [
        { t: T.anne, pos: [ANNE_CX, 9, z0 - 18], look: [ANNE_CX, 1.6, z0 + 2] },
        { t: T.anne + 1.6, pos: [ANNE_CX, 7.6, z0 - 6], look: [ANNE_CX, 1, z0 + 4] },
        { t: T.night, pos: [v.pos.x, v.pos.y, v.pos.z], look: [v.look.x, v.look.y, v.look.z] },
      ],
    },
    // Night falls: low pass down Anne Maju's street, lit windows and lamp pools
    {
      from: T.night,
      to: T.soon,
      day: 0.875,
      keys: [
        { t: T.night, pos: [ANNE_CX - 36, 13, z0 - 24], look: [ANNE_CX - 8, 1, z0 - 4] },
        { t: T.soon, pos: [ANNE_CX - 22, 10, z0 - 20], look: [ANNE_CX + 6, 1, z0 - 4] },
      ],
    },
    // Coming soon: slow high orbit at dusk behind the cards
    {
      from: T.soon,
      to: T.end,
      day: 0.58,
      keys: [
        { t: T.soon, pos: [-70, 70, 70], look: [0, 0, 0] },
        { t: T.end, pos: [-30, 64, 88], look: [0, 0, 0] },
      ],
    },
    // End card over the night city
    {
      from: T.end,
      to: DURATION,
      day: 0.875,
      keys: [
        { t: T.end, pos: [ANNE_CX - 22, 10, z0 - 20], look: [ANNE_CX + 6, 1, z0 - 4] },
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

const SOON = [
  { icon: "🛵", title: "Rider Laju", sub: "Hantar makanan, kejar rating", tone: "#1f9d55" },
  { icon: "🅿️", title: "Cari Parking", sub: "Pusing-pusing, elak saman", tone: "#2f6fd6" },
  { icon: "🌙", title: "Pasar Malam", sub: "Buka gerai, tawar-menawar", tone: "#7a3fb0" },
  { icon: "🏙️", title: "Menara Berkembar", sub: "KLCC Lepak & daerah baru", tone: "#d8352a" },
  { icon: "👥", title: "Kawan & Cerita", sub: "Watak, misi, telefon penuh", tone: "#e07b00" },
];

/** A coming-soon card sliding in from the right. */
function soonCard(g: CanvasRenderingContext2D, item: (typeof SOON)[number], y: number, k: number) {
  if (k <= 0) return;
  const w = 760;
  const h = 118;
  const x = (SIZE - w) / 2 + (1 - Math.min(1, k)) * 600;
  g.save();
  g.globalAlpha = Math.min(1, k * 1.4);
  roundRect(g, x, y + 10, w, h, 36);
  g.fillStyle = "#1f1a17";
  g.fill();
  roundRect(g, x, y, w, h, 36);
  g.fillStyle = "#fbf3e4";
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = "#1f1a17";
  g.stroke();
  // Icon tile
  roundRect(g, x + 18, y + 16, 86, 86, 24);
  g.fillStyle = item.tone;
  g.fill();
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `48px ${FONT}`;
  g.fillText(item.icon, x + 61, y + 62);
  g.textAlign = "left";
  g.fillStyle = "#1f1a17";
  g.font = `800 44px ${FONT}`;
  g.fillText(item.title, x + 128, y + 44);
  g.fillStyle = "rgba(31,26,23,0.6)";
  g.font = `700 28px ${FONT}`;
  g.fillText(item.sub, x + 128, y + 86);
  // "Soon" tag
  g.font = `800 24px ${FONT}`;
  const tw = g.measureText("SOON").width + 28;
  roundRect(g, x + w - tw - 22, y + 38, tw, 42, 21);
  g.fillStyle = "#fcd34d";
  g.fill();
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = "#1f1a17";
  g.textAlign = "center";
  g.fillText("SOON", x + w - tw / 2 - 22, y + 60);
  g.restore();
}

function captions(g: CanvasRenderingContext2D, t: number) {
  if (t < T.street) {
    const a = pop(t, 0.25);
    if (a > 0) wordmark(g, SIZE / 2, 300, 0.95 * a);
    const b = pop(t, 1.0);
    if (b > 0) sticker(g, "Bandar 3D ala Malaysia 🇲🇾", SIZE / 2, 560, 46 * b, "#fbf3e4", "#1f1a17", -0.03);
  } else if (t < T.lrt) {
    const a = pop(t, T.street + 0.15);
    if (a > 0) sticker(g, "Jalan raya hidup. Rider merata. 🛵", SIZE / 2, 900, 44 * a, "#fcd34d");
  } else if (t < T.anne) {
    const a = pop(t, T.lrt + 0.15);
    if (a > 0) sticker(g, "Naik LRT Laluan Kelana 🚆", SIZE / 2, 900, 46 * a, "#d8352a", "#ffffff", -0.02);
  } else if (t < T.night) {
    const a = pop(t, T.anne + 0.15);
    if (a > 0) sticker(g, "Kerja pertama: Anne Maju 🍵", SIZE / 2, 130, 48 * a, "#d8352a", "#ffffff", -0.02);
    const b = pop(t, T.anne + 1.9);
    if (b > 0) sticker(g, "“Anne, teh tarik kurang manis satu!”", SIZE / 2, 930, 38 * b, "#ffffff", "#1f1a17", 0.02);
  } else if (t < T.soon) {
    const a = pop(t, T.night + 0.15);
    if (a > 0) sticker(g, "Siang ke malam, ikut jam kau 🌙", SIZE / 2, 900, 44 * a, "#fbf3e4");
  } else if (t < T.end) {
    const k = Math.min(1, (t - T.soon) / 0.4);
    g.fillStyle = `rgba(31,26,23,${0.5 * k})`;
    g.fillRect(0, 0, SIZE, SIZE);
    const a = pop(t, T.soon + 0.15);
    if (a > 0) sticker(g, "AKAN DATANG 👀", SIZE / 2, 120, 58 * a, "#fcd34d", "#1f1a17", -0.03);
    SOON.forEach((item, i) => soonCard(g, item, 220 + i * 150, (t - (T.soon + 0.7 + i * 0.75)) / 0.35));
  } else {
    const k = Math.min(1, (t - T.end) / 0.4);
    g.fillStyle = `rgba(31,26,23,${0.55 * k})`;
    g.fillRect(0, 0, SIZE, SIZE);
    const a = pop(t, T.end + 0.1);
    if (a > 0) wordmark(g, SIZE / 2, 380, 1.0 * a);
    const b = pop(t, T.end + 0.6);
    if (b > 0) sticker(g, "Main percuma: kl.dotkod.com", SIZE / 2, 690, 46 * b, "#fcd34d");
    const c = pop(t, T.end + 0.9);
    if (c > 0) sticker(g, "Follow @kualalepak untuk update", SIZE / 2, 820, 40 * c, "#1f1a17", "#fbf3e4");
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
  const cuts = shots.slice(1).map((s) => s.from);

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
  let trainX: number | null = null;
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    const shot = shots.find((s) => t >= s.from && t < s.to) ?? shots[shots.length - 1];
    setTimeOfDay(shot.day);
    insideShop(!!shot.inside || (shot.from === T.anne && t > T.anne + 2.3));
    let c = cameraAt(shot.keys, t);
    // LRT segment: track the train itself (it may be cruising or dwelling at a station)
    if (shot.from === T.lrt) {
      if (trainX === null) {
        // Skip ahead to the moment it pulls out, so the segment shows it moving
        let guard = 0;
        while (getShuttle().phase !== "dwell" && guard++ < 3000) tickShuttle(1 / 30);
        while (getShuttle().phase === "dwell" && guard++ < 6000) tickShuttle(1 / 30);
      }
      const tr = getShuttle();
      trainX = trainX === null ? tr.x : trainX + (tr.x - trainX) * 0.12;
      const k = (t - T.lrt) / (T.anne - T.lrt);
      c = {
        pos: new Vector3(trainX - 20 + k * 6, tr.y + 7, TRACK_Z - 17),
        look: new Vector3(trainX + 2, tr.y + 0.5, TRACK_Z),
      };
    }
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
