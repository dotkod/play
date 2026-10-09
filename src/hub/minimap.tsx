"use client";

import { useEffect, useRef } from "react";
import { getWalkRoute } from "@/core/walk-path";
import { getWaypoint } from "@/core/waypoint";
import { pathAlongRoads } from "@/world/walk-spine";
import { catStates } from "./cats";
import { dynamicColliders } from "./colliders";
import {
  MAP_ORIGIN_X,
  MAP_ORIGIN_Z,
  MAP_SPAN_X,
  MAP_SPAN_Z,
  paintCityBase,
} from "./map-draw";
import { player } from "./traffic";

const VIEW = 52;

export function Minimap({ size, onOpen }: { size: number; onOpen: () => void }) {
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
    const X = (x: number) => (x - MAP_ORIGIN_X) * k;
    const Z = (z: number) => (z - MAP_ORIGIN_Z) * k;

    const base = document.createElement("canvas");
    base.width = Math.ceil(MAP_SPAN_X * k);
    base.height = Math.ceil(MAP_SPAN_Z * k);
    paintCityBase(base.getContext("2d")!, X, Z, k, dpr);

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return;
      last = t;
      const ox = X(player.x) - c.width / 2;
      const oz = Z(player.z) - c.height / 2;
      view.current = { ox, oz, k };
      g.fillStyle = "#86c27a";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(base, -ox, -oz);
      g.fillStyle = "#ffffff";
      for (const v of dynamicColliders.vehicles) g.fillRect(X(v.x) - ox - 1.5 * dpr, Z(v.z) - oz - 1.5 * dpr, 3 * dpr, 3 * dpr);
      g.fillStyle = "#f28c28";
      for (const cat of catStates()) {
        g.beginPath();
        g.arc(X(cat.x) - ox, Z(cat.z) - oz, 2.6 * dpr, 0, Math.PI * 2);
        g.fill();
      }
      const wp = getWaypoint();
      const route =
        getWalkRoute().length > 1
          ? getWalkRoute()
          : wp
            ? pathAlongRoads(player.x, player.z, wp.x, wp.z)
            : [];
      if (route.length > 1) {
        g.strokeStyle = "#c62f25";
        g.lineWidth = 2 * dpr;
        g.setLineDash([5 * dpr, 4 * dpr]);
        g.beginPath();
        route.forEach((p, i) => {
          const px = X(p.x) - ox;
          const pz = Z(p.z) - oz;
          if (i === 0) g.moveTo(px, pz);
          else g.lineTo(px, pz);
        });
        g.stroke();
        g.setLineDash([]);
      }
      if (wp) {
        g.fillStyle = "#fcd34d";
        g.beginPath();
        g.arc(X(wp.x) - ox, Z(wp.z) - oz, 4 * dpr, 0, Math.PI * 2);
        g.fill();
      }
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
    <button type="button" className="relative block" onClick={onOpen} aria-label="Map">
      <canvas
        ref={canvas}
        style={{ width: size, height: size }}
        className="rounded-2xl border-4 border-ink bg-[#86c27a] shadow-[0_4px_0_#1f1a17]"
      />
      <span className="absolute right-1 bottom-1 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-cream uppercase">
        +
      </span>
    </button>
  );
}
