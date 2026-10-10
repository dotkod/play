"use client";

/**
 * Minimap drawn straight from the city plan: grass, roads, sidewalks, buildings (Anne Maju
 * highlighted) and you. The static map is painted once; each frame copies the piece around
 * the player, rotated so "up" matches the camera.
 */

import { useEffect, useRef } from "react";
import { view } from "@/hub/controls";
import { player } from "@/world/player-bridge";
import { asphalt, BUILDINGS, GRID, STREETS } from "../plan";

const PPM = 3; // pixels per metre on the static layer

let base: HTMLCanvasElement | null = null;

function paintBase() {
  if (base) return base;
  const B = GRID.bounds;
  const c = document.createElement("canvas");
  c.width = Math.ceil((B.maxX - B.minX) * PPM);
  c.height = Math.ceil((B.maxZ - B.minZ) * PPM);
  const g = c.getContext("2d")!;
  const X = (x: number) => (x - B.minX) * PPM;
  const Z = (z: number) => (z - B.minZ) * PPM;
  const rect = (r: { minX: number; maxX: number; minZ: number; maxZ: number }, color: string) => {
    g.fillStyle = color;
    g.fillRect(X(r.minX), Z(r.minZ), (r.maxX - r.minX) * PPM, (r.maxZ - r.minZ) * PPM);
  };
  g.fillStyle = "#8fca7f";
  g.fillRect(0, 0, c.width, c.height);
  for (const s of GRID.sidewalks) rect(s, "#e6dfd1");
  for (const s of STREETS.surfaces) rect(s.rect, s.kind === "grass" ? "#86c777" : s.kind === "path" ? "#e8d9ae" : "#ece6da");
  for (const a of asphalt(GRID)) rect(a, "#4b5058");
  for (const b of BUILDINGS) {
    rect(b.rect, b.game ? "#fcd34d" : b.kind === "office" ? "#b8c4d0" : b.kind === "mall" ? "#cfc6ea" : b.color);
    g.strokeStyle = "rgba(31,26,23,0.55)";
    g.lineWidth = 1.5;
    g.strokeRect(X(b.rect.minX), Z(b.rect.minZ), (b.rect.maxX - b.rect.minX) * PPM, (b.rect.maxZ - b.rect.minZ) * PPM);
  }
  // Anne Maju marker
  const anne = BUILDINGS.find((b) => b.game);
  if (anne) {
    g.font = `${PPM * 6}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("🍵", X((anne.rect.minX + anne.rect.maxX) / 2), Z((anne.rect.minZ + anne.rect.maxZ) / 2));
  }
  base = c;
  return c;
}

export function CityMinimap({ size, onOpen }: { size: number; onOpen?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const g = canvas.getContext("2d")!;
    const map = paintBase();
    const B = GRID.bounds;
    const span = 70; // metres shown edge to edge
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 66) return;
      last = t;
      const s = (size * dpr) / span;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#8fca7f";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.translate(canvas.width / 2, canvas.height / 2);
      // Camera yaw 0 looks north; rotate so the view direction is up
      g.rotate(view.yaw);
      g.scale(s / PPM, s / PPM);
      g.drawImage(map, -(player.x - B.minX) * PPM, -(player.z - B.minZ) * PPM);
      g.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);
      // You: arrow pointing where you face, relative to the camera
      g.rotate(view.yaw + Math.PI - player.rot);
      g.fillStyle = "#d8352a";
      g.strokeStyle = "#ffffff";
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.moveTo(0, -8 * dpr);
      g.lineTo(6 * dpr, 6 * dpr);
      g.lineTo(0, 3 * dpr);
      g.lineTo(-6 * dpr, 6 * dpr);
      g.closePath();
      g.stroke();
      g.fill();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return (
    <button type="button" onClick={onOpen} aria-label="Peta" className="relative block rounded-2xl active:translate-y-0.5">
      <canvas ref={ref} style={{ width: size, height: size }} className="rounded-2xl border-[3px] border-ink bg-[#8fca7f] shadow-[0_4px_0_#1f1a17]" />
      <span className="absolute right-1.5 bottom-1.5 grid size-6 place-items-center rounded-lg border-2 border-ink bg-cream text-[11px] font-extrabold text-ink">⤢</span>
    </button>
  );
}
