/**
 * Canvas textures for ground surfaces and shop signs. Each is drawn once and cached at
 * module level (never per mount), and tiles in world units via the geometry's UVs.
 */

import * as THREE from "three";
import { seeded } from "../plan/lots";

export type SurfaceKind = "sidewalk" | "asphalt" | "grass" | "plaza" | "lane" | "path";

/** Metres covered by one repeat of each texture. */
export const TILE_M: Record<SurfaceKind, number> = {
  sidewalk: 2,
  asphalt: 8,
  grass: 6,
  plaza: 3,
  lane: 4,
  path: 3,
};

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

function speckle(g: CanvasRenderingContext2D, s: number, colors: string[], count: number, seed: number, size = 2) {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.fillRect(rnd() * s, rnd() * s, size * (0.5 + rnd()), size * (0.5 + rnd()));
  }
}

/** Square paving slabs with grout lines and a little tone variation. */
function tiles(g: CanvasRenderingContext2D, s: number, n: number, base: string[], grout: string, seed: number) {
  const rnd = seeded(seed);
  const t = s / n;
  g.fillStyle = grout;
  g.fillRect(0, 0, s, s);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      g.fillStyle = base[Math.floor(rnd() * base.length)];
      g.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
    }
  }
  speckle(g, s, ["rgba(0,0,0,0.05)", "rgba(255,255,255,0.08)"], 260, seed + 1);
}

export function surfaceTexture(kind: SurfaceKind) {
  return canvasTexture(kind, 256, (g, s) => {
    switch (kind) {
      case "sidewalk":
        tiles(g, s, 4, ["#d9d2c4", "#d2cabb", "#ddd6c9"], "#a99f8f", 11);
        break;
      case "plaza":
        tiles(g, s, 3, ["#e8e1d3", "#e1d9c9", "#ece6da"], "#c2b8a6", 12);
        break;
      case "asphalt":
        g.fillStyle = "#50545b";
        g.fillRect(0, 0, s, s);
        speckle(g, s, ["#5b6068", "#464a50", "#62666d", "#3f4348"], 1800, 13, 2);
        break;
      case "grass":
        g.fillStyle = "#7cbc6e";
        g.fillRect(0, 0, s, s);
        speckle(g, s, ["#86c777", "#72b265", "#8fcf80", "#6aa95d"], 1400, 14, 3);
        break;
      case "lane":
        g.fillStyle = "#b5b0a6";
        g.fillRect(0, 0, s, s);
        speckle(g, s, ["#aaa59b", "#c0bbb1", "#9e998f"], 900, 15, 2);
        g.strokeStyle = "rgba(60,55,50,0.25)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, s * 0.5);
        g.lineTo(s, s * 0.5);
        g.stroke();
        break;
      case "path":
        g.fillStyle = "#e3d3a8";
        g.fillRect(0, 0, s, s);
        speckle(g, s, ["#d6c597", "#efe1ba", "#cbb88a"], 1200, 16, 3);
        break;
    }
  });
}

function signFont() {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
}

export type SignSlot = { from: number; to: number; text: string; bg: string; fg: string };

/** One long fascia texture for a shophouse row: each shop paints its sign in its slot. */
export function rowSignTexture(key: string, length: number, slots: SignSlot[]) {
  const ppm = 64;
  const w = Math.min(4096, Math.ceil(length * ppm));
  const h = 80;
  const hit = cache.get(`sign:${key}`);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const draw = () => {
    const g = c.getContext("2d")!;
    const k = w / length;
    for (const s of slots) {
      const x0 = s.from * k;
      const x1 = s.to * k;
      g.fillStyle = s.bg;
      g.fillRect(x0, 0, x1 - x0, h);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x0, 0, x1 - x0, 6);
      g.fillStyle = "#1f1a17";
      g.fillRect(x1 - 3, 0, 3, h);
      g.fillStyle = s.fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      let size = 40;
      const font = signFont();
      g.font = `800 ${size}px ${font}`;
      while (g.measureText(s.text).width > (x1 - x0) * 0.9 && size > 14) {
        size -= 2;
        g.font = `800 ${size}px ${font}`;
      }
      g.fillText(s.text, (x0 + x1) / 2, h / 2 + 3);
    }
  };
  draw();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(`sign:${key}`, t);
  // Redraw once the brand font has loaded
  if (typeof document !== "undefined" && document.fonts) {
    void document.fonts.ready.then(() => {
      draw();
      t.needsUpdate = true;
    });
  }
  return t;
}

/** Single-text label (vans, the bus stop, office names), drawn at the label's aspect. */
export function labelTexture(text: string, bg: string, fg: string, aspect = 4) {
  const key = `label:${text}:${bg}:${fg}:${aspect}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round(512 / aspect);
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = Math.round(c.height * 0.72);
  g.font = `900 ${size}px ${signFont()}`;
  while (g.measureText(text).width > c.width * 0.9 && size > 10) {
    size -= 2;
    g.font = `900 ${size}px ${signFont()}`;
  }
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}
