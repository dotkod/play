"use client";

import { useEffect, useRef } from "react";
import { catStates } from "./cats";
import { dynamicColliders } from "./colliders";
import { input } from "./controls";
import { player } from "./traffic";
import { BOUNDS, BUILDINGS, doorSpot, EXTENT, footprint, ROAD_HALF, WALK_HALF } from "./world-data";

const SPAN = EXTENT * 2; // metres in the full city plan
const VIEW = 46; // metres shown edge to edge, centred on the player

// North-up plan that follows the player. The city is drawn once to an offscreen canvas;
// each frame we blit the window around the player and add traffic and the player arrow.
export function Minimap({ size }: { size: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef({ ox: 0, oz: 0, k: 1 });

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const g = c.getContext("2d")!;
    const k = (size * dpr) / VIEW;
    const X = (x: number) => (x + EXTENT) * k;
    const Z = (z: number) => (z + EXTENT) * k;

    // Static layer: grass, sidewalks, roads, buildings
    const base = document.createElement("canvas");
    base.width = Math.ceil(SPAN * k);
    base.height = Math.ceil(SPAN * k);
    const b = base.getContext("2d")!;
    b.fillStyle = "#86c27a";
    b.fillRect(0, 0, base.width, base.height);
    b.fillStyle = "#d9d5cc";
    b.fillRect(0, Z(-WALK_HALF), base.width, WALK_HALF * 2 * k);
    b.fillRect(X(-WALK_HALF), 0, WALK_HALF * 2 * k, base.height);
    b.fillStyle = "#4f545a";
    b.fillRect(0, Z(-ROAD_HALF), base.width, ROAD_HALF * 2 * k);
    b.fillRect(X(-ROAD_HALF), 0, ROAD_HALF * 2 * k, base.height);
    for (const bd of BUILDINGS) {
      const f = footprint(bd);
      b.fillStyle = bd.game ? "#fcd34d" : bd.soon ? "#fbf3e4" : bd.color;
      b.strokeStyle = "#1f1a17";
      b.lineWidth = 1.5 * dpr;
      b.fillRect(X(f.minX), Z(f.minZ), bd.w * k, bd.d * k);
      b.strokeRect(X(f.minX), Z(f.minZ), bd.w * k, bd.d * k);
      if (bd.game || bd.soon) {
        const info = (bd.game ?? bd.soon)!;
        b.font = `${Math.round(14 * dpr)}px system-ui, sans-serif`;
        b.textAlign = "center";
        b.textBaseline = "middle";
        b.fillText(info.emoji, X(f.cx), Z(f.cz));
      }
    }
    // Door marker for the playable building
    for (const bd of BUILDINGS.filter((x) => x.game)) {
      const d = doorSpot(bd);
      b.fillStyle = "#d8352a";
      b.beginPath();
      b.arc(X(d.x), Z(d.z), 3 * dpr, 0, Math.PI * 2);
      b.fill();
    }

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return;
      last = t;
      // Window origin in base-canvas pixels, centred on the player
      const ox = X(player.x) - c.width / 2;
      const oz = Z(player.z) - c.height / 2;
      view.current = { ox, oz, k };
      g.fillStyle = "#86c27a";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(base, -ox, -oz);
      // Traffic as small dots
      g.fillStyle = "#ffffff";
      for (const v of dynamicColliders.vehicles) g.fillRect(X(v.x) - ox - 1.5 * dpr, Z(v.z) - oz - 1.5 * dpr, 3 * dpr, 3 * dpr);
      // Cats as little orange dots
      g.fillStyle = "#f28c28";
      for (const cat of catStates()) {
        g.beginPath();
        g.arc(X(cat.x) - ox, Z(cat.z) - oz, 2.6 * dpr, 0, Math.PI * 2);
        g.fill();
      }
      // Player arrow in the middle, pointing the way they're facing
      g.save();
      g.translate(c.width / 2, c.height / 2);
      g.rotate(-player.rot + Math.PI);
      g.fillStyle = "#fcd34d";
      g.strokeStyle = "#1f1a17";
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.moveTo(0, -7 * dpr);
      g.lineTo(5 * dpr, 5 * dpr);
      g.lineTo(0, 2.5 * dpr);
      g.lineTo(-5 * dpr, 5 * dpr);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvas}
      style={{ width: size, height: size }}
      className="cursor-crosshair rounded-2xl border-4 border-ink bg-[#86c27a] shadow-[0_4px_0_#1f1a17]"
      aria-label="Minimap"
      onClick={(e) => {
        // Tap the map to walk there (undo the player-centred window and the scale)
        const rect = e.currentTarget.getBoundingClientRect();
        const { ox, oz, k } = view.current;
        const scale = e.currentTarget.width / rect.width;
        const x = ((e.clientX - rect.left) * scale + ox) / k - EXTENT;
        const z = ((e.clientY - rect.top) * scale + oz) / k - EXTENT;
        input.target = { x: Math.max(-BOUNDS, Math.min(BOUNDS, x)), z: Math.max(-BOUNDS, Math.min(BOUNDS, z)) };
      }}
    />
  );
}
