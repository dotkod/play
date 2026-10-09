"use client";

import { useEffect, useRef, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { getWalkRoute, setWalkRoute } from "@/core/walk-path";
import { getUserWaypoint, getWaypoint, onWaypoint, setUserWaypoint } from "@/core/waypoint";
import { pathAlongRoads } from "@/world/walk-spine";
import { catStates } from "./cats";
import { input } from "./controls";
import {
  MAP_ORIGIN_X,
  MAP_ORIGIN_Z,
  MAP_SPAN_X,
  MAP_SPAN_Z,
  paintCityBase,
  worldFromCanvas,
} from "./map-draw";
import { WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_X, WORLD_MIN_Z } from "@/world/bounds";
import { useLang } from "@/shared/lang";
import { player } from "./traffic";
import { HUB_STRINGS } from "./strings";

const METERS_PER_PX = 0.22; // zoomed-in vs corner minimap

/** Keep the viewport over painted city — no empty grass beyond WORLD_* bounds. */
function clampPan(x: number, z: number, canvasW: number, canvasH: number, k: number) {
  const halfW = canvasW / (2 * k);
  const halfH = canvasH / (2 * k);
  const minX = WORLD_MIN_X + halfW;
  const maxX = WORLD_MAX_X - halfW;
  const minZ = WORLD_MIN_Z + halfH;
  const maxZ = WORLD_MAX_Z - halfH;
  if (minX > maxX) x = (WORLD_MIN_X + WORLD_MAX_X) / 2;
  else x = Math.min(maxX, Math.max(minX, x));
  if (minZ > maxZ) z = (WORLD_MIN_Z + WORLD_MAX_Z) / 2;
  else z = Math.min(maxZ, Math.max(minZ, z));
  return { x, z };
}

export function CityMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const tr = HUB_STRINGS[lang];
  const canvas = useRef<HTMLCanvasElement>(null);
  const pan = useRef({ x: 0, z: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; pz: number; moved: boolean } | null>(null);
  const view = useRef({ ox: 0, oz: 0, k: 1 });
  const hasPin = useSyncExternalStore(
    onWaypoint,
    () => !!getUserWaypoint(),
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    pan.current = { x: player.x, z: player.z };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const c = canvas.current;
    if (!c) return;
    const parent = c.parentElement;
    if (!parent) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    };
    resize();

    const k = dpr / METERS_PER_PX;
    const X = (x: number) => (x - MAP_ORIGIN_X) * k;
    const Z = (z: number) => (z - MAP_ORIGIN_Z) * k;

    const base = document.createElement("canvas");
    base.width = Math.ceil(MAP_SPAN_X * k);
    base.height = Math.ceil(MAP_SPAN_Z * k);
    paintCityBase(base.getContext("2d")!, X, Z, k, dpr);

    let raf = 0;
    let last = 0;
    const g = c.getContext("2d")!;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return;
      last = t;
      pan.current = clampPan(pan.current.x, pan.current.z, c.width, c.height, k);
      const ox = X(pan.current.x) - c.width / 2;
      const oz = Z(pan.current.z) - c.height / 2;
      view.current = { ox, oz, k };
      g.fillStyle = "#86c27a";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(base, -ox, -oz);

      g.fillStyle = "#f28c28";
      for (const cat of catStates()) {
        g.beginPath();
        g.arc(X(cat.x) - ox, Z(cat.z) - oz, 3 * dpr, 0, Math.PI * 2);
        g.fill();
      }

      const wp = getWaypoint();
      // Active walk route, or preview path to the current pin (always along roads)
      const route =
        getWalkRoute().length > 1
          ? getWalkRoute()
          : wp
            ? pathAlongRoads(player.x, player.z, wp.x, wp.z)
            : [];
      if (route.length > 1) {
        g.strokeStyle = "#c62f25";
        g.lineWidth = 3 * dpr;
        g.setLineDash([8 * dpr, 6 * dpr]);
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
        g.strokeStyle = "#fcd34d";
        g.fillStyle = "rgba(252,211,77,0.35)";
        g.lineWidth = 2 * dpr;
        g.beginPath();
        g.arc(X(wp.x) - ox, Z(wp.z) - oz, 10 * dpr, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = "#1f1a17";
        g.font = `bold ${Math.round(11 * dpr)}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText(wp.label ?? "📍", X(wp.x) - ox, Z(wp.z) - oz - 14 * dpr);
      }

      // Player
      const px = X(player.x) - ox;
      const pz = Z(player.z) - oz;
      g.save();
      g.translate(px, pz);
      g.rotate(-player.rot + Math.PI);
      g.fillStyle = "#fcd34d";
      g.strokeStyle = "#1f1a17";
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.moveTo(0, -9 * dpr);
      g.lineTo(6 * dpr, 6 * dpr);
      g.lineTo(0, 3 * dpr);
      g.lineTo(-6 * dpr, 6 * dpr);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    };
    raf = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (!open) return null;

  const endDrag = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!d || d.moved) return;
    const c = canvas.current;
    if (!c) return;
    const { ox, oz, k } = view.current;
    const world = worldFromCanvas(e.clientX, e.clientY, c.getBoundingClientRect(), c, ox, oz, k);
    setUserWaypoint({ x: world.x, z: world.z, label: tr.mapPin });
    setWalkRoute({ x: player.x, z: player.z }, world);
    input.target = { x: world.x, z: world.z };
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-ink/50 backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0" aria-label={tr.close} onClick={onClose} />
      <div className="relative z-10 mx-auto mt-[max(0.75rem,env(safe-area-inset-top))] mb-3 flex w-[min(960px,100%-1rem)] flex-1 flex-col overflow-hidden rounded-3xl border-4 border-ink bg-[#86c27a] shadow-[0_12px_0_#1f1a17]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-ink bg-cream px-3 py-2">
          <div>
            <p className="text-sm font-extrabold text-ink">{tr.mapTitle}</p>
            <p className="text-[11px] font-bold text-ink/60">{tr.mapHint}</p>
          </div>
          <div className="flex gap-2">
            {hasPin && (
              <button
                type="button"
                className="rounded-xl border-2 border-ink bg-white px-2 py-1 text-xs font-extrabold"
                onClick={() => setUserWaypoint(null)}
              >
                {tr.mapClearPin}
              </button>
            )}
            <button type="button" className="rounded-xl border-2 border-ink bg-amber-300 px-3 py-1 text-xs font-extrabold" onClick={onClose}>
              {tr.close}
            </button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 touch-none">
          <canvas
            ref={canvas}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { sx: e.clientX, sy: e.clientY, px: pan.current.x, pz: pan.current.z, moved: false };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const dx = e.clientX - d.sx;
              const dy = e.clientY - d.sy;
              if (Math.hypot(dx, dy) > 8) d.moved = true;
              if (!d.moved) return;
              // Drag map under finger (invert screen delta → world), clamped to city
              const c = canvas.current;
              const k = c ? Math.min(2, window.devicePixelRatio || 1) / METERS_PER_PX : 1 / METERS_PER_PX;
              pan.current = clampPan(
                d.px - dx * METERS_PER_PX,
                d.pz - dy * METERS_PER_PX,
                c?.width ?? 1,
                c?.height ?? 1,
                k,
              );
            }}
            onPointerUp={endDrag}
            onPointerCancel={() => {
              drag.current = null;
            }}
          />
        </div>
      </div>
    </div>
  );
}
