"use client";

/**
 * Full city map (opened from the minimap). An illustrated map painted once from the city
 * plan (roads with their markings, sidewalks, the park, every building with a soft shadow,
 * street names), with live pins on top. Drag to pan, wheel or pinch to zoom, tap a building
 * to see what it is.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { player } from "@/world/player-bridge";
import { useLang } from "@/shared/lang";
import { asphalt, BUILDINGS, type CityBuilding, GRID, inRect, STREET_NAMES, STREETS } from "../plan";

const PPM = 8; // pixels per metre on the painted map
const B = GRID.bounds;
const MAP_W = Math.ceil((B.maxX - B.minX) * PPM);
const MAP_H = Math.ceil((B.maxZ - B.minZ) * PPM);
const X = (x: number) => (x - B.minX) * PPM;
const Z = (z: number) => (z - B.minZ) * PPM;

const T = {
  ms: { title: "Peta", area: "Pusat Lepak", you: "Kau", anne: "Anne Maju", bus: "Bas", park: "Taman", recentre: "Pusat semula", close: "Tutup", hint: "Seret untuk gerak · tekan bangunan" },
  en: { title: "Map", area: "Pusat Lepak", you: "You", anne: "Anne Maju", bus: "Bus", park: "Park", recentre: "Re-centre", close: "Close", hint: "Drag to move · tap a building" },
};

let painted: HTMLCanvasElement | null = null;

function buildingFill(b: CityBuilding) {
  if (b.game) return "#fcd34d";
  if (b.kind === "office") return "#b9c6d3";
  if (b.kind === "mall") return "#d2c8f0";
  return b.color;
}

/** The static map, painted once per page. */
function paintMap(): HTMLCanvasElement {
  if (painted) return painted;
  const c = document.createElement("canvas");
  c.width = MAP_W;
  c.height = MAP_H;
  const g = c.getContext("2d")!;
  const rect = (r: { minX: number; maxX: number; minZ: number; maxZ: number }, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(X(r.minX), Z(r.minZ), (r.maxX - r.minX) * PPM, (r.maxZ - r.minZ) * PPM);
  };

  // Grass with a little texture
  g.fillStyle = "#95cf82";
  g.fillRect(0, 0, MAP_W, MAP_H);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,60,0,0.05)";
    const x = (i * 7919) % MAP_W;
    const y = (i * 104729) % MAP_H;
    g.fillRect(x, y, 3, 3);
  }

  for (const s of GRID.sidewalks) rect(s, "#efe6d4");
  for (const s of STREETS.surfaces) rect(s.rect, s.kind === "grass" ? "#8cc979" : s.kind === "path" ? "#ead9ab" : s.kind === "lane" ? "#d9d3c7" : "#f5efe3");

  // Roads and their paint
  for (const a of asphalt(GRID)) rect(a, "#454a52");
  for (const m of STREETS.markings) {
    const r = m.rect;
    if (m.kind !== "zebra") {
      rect(r, m.kind === "stop" ? "#ffffff" : "rgba(255,255,255,0.85)");
      continue;
    }
    g.fillStyle = "#ffffff";
    if (m.axis === "z") for (let z = r.minZ + 0.35; z + 0.5 <= r.maxZ - 0.2; z += 1) g.fillRect(X(r.minX), Z(z), (r.maxX - r.minX) * PPM, 0.5 * PPM);
    else for (let x = r.minX + 0.35; x + 0.5 <= r.maxX - 0.2; x += 1) g.fillRect(X(x), Z(r.minZ), 0.5 * PPM, (r.maxZ - r.minZ) * PPM);
  }

  // Trees and the fountain
  for (const p of STREETS.props) {
    if (p.kind === "tree") {
      g.fillStyle = "rgba(0,0,0,0.15)";
      g.beginPath();
      g.arc(X(p.x) + 3, Z(p.z) + 3, 1.3 * PPM, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ["#3f9a5a", "#4aa866", "#378b4f"][p.variant % 3];
      g.beginPath();
      g.arc(X(p.x), Z(p.z), 1.3 * PPM, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.beginPath();
      g.arc(X(p.x) - 3, Z(p.z) - 3, 0.6 * PPM, 0, Math.PI * 2);
      g.fill();
    } else if (p.kind === "fountain") {
      g.fillStyle = "#cfc8bb";
      g.beginPath();
      g.arc(X(p.x), Z(p.z), 2.5 * PPM, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#6ec4e8";
      g.beginPath();
      g.arc(X(p.x), Z(p.z), 2.1 * PPM, 0, Math.PI * 2);
      g.fill();
    } else if (p.kind === "playground") {
      rect({ minX: p.x - 3, maxX: p.x + 3, minZ: p.z - 2, maxZ: p.z + 2 }, "#f2b98a");
    }
  }

  // Buildings: soft drop shadow, fill, ink outline, lighter roof inset
  for (const b of BUILDINGS) {
    const r = b.rect;
    const w = (r.maxX - r.minX) * PPM;
    const h = (r.maxZ - r.minZ) * PPM;
    g.fillStyle = "rgba(31,26,23,0.22)";
    g.fillRect(X(r.minX) + 5, Z(r.minZ) + 6, w, h);
    g.fillStyle = buildingFill(b);
    g.fillRect(X(r.minX), Z(r.minZ), w, h);
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.fillRect(X(r.minX) + 5, Z(r.minZ) + 5, w - 10, h - 10);
    g.strokeStyle = "#1f1a17";
    g.lineWidth = 2.5;
    g.strokeRect(X(r.minX), Z(r.minZ), w, h);
    if (b.kind === "office" || b.kind === "mall") {
      g.font = `800 ${PPM * 1.6}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#1f1a17";
      g.fillText(b.kind === "mall" ? "🛍️" : "🏢", X((r.minX + r.maxX) / 2), Z((r.minZ + r.maxZ) / 2) - PPM * 1.3);
      g.font = `800 ${PPM * 1.15}px system-ui, sans-serif`;
      g.fillText(b.sign, X((r.minX + r.maxX) / 2), Z((r.minZ + r.maxZ) / 2) + PPM * 1.1);
    }
  }

  // Street names along the middle block of each road
  g.font = `800 ${PPM * 1.5}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const label = (text: string, x: number, z: number, rot: number) => {
    g.save();
    g.translate(X(x), Z(z));
    g.rotate(rot);
    g.lineWidth = 5;
    g.strokeStyle = "#2b2f35";
    g.strokeText(text, 0, 0);
    g.fillStyle = "#fbf3e4";
    g.fillText(text, 0, 0);
    g.restore();
  };
  // Middle of the central block, so labels sit mid-road and never on a junction
  const midBlock = (lines: number[]) => {
    const k = Math.floor((lines.length - 2) / 2);
    return (lines[k] + lines[k + 1]) / 2;
  };
  GRID.zs.forEach((z, j) => label(STREET_NAMES.x[j] ?? "", midBlock(GRID.xs), z, 0));
  GRID.xs.forEach((x, i) => label(STREET_NAMES.z[i] ?? "", x, midBlock(GRID.zs), -Math.PI / 2));

  painted = c;
  return c;
}

type ViewState = { k: number; tx: number; ty: number };

function Pin({ x, z, icon, tone, label }: { x: number; z: number; icon: string; tone: string; label: string }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: X(x), top: Z(z) }} aria-label={label}>
      <div className={`grid size-12 place-items-center rounded-2xl border-[3px] border-ink text-2xl shadow-[0_4px_0_#1f1a17] ${tone}`}>{icon}</div>
      <div className="mx-auto size-3 -translate-y-1.5 rotate-45 border-r-[3px] border-b-[3px] border-ink bg-inherit" />
    </div>
  );
}

function MapButton({ label, title, onClick }: { label: string; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title ?? label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-2xl border-[3px] border-ink bg-cream text-xl font-extrabold text-ink shadow-[0_3px_0_#1f1a17] active:translate-y-0.5"
    >
      {label}
    </button>
  );
}

export function CityMapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const tr = T[lang];
  const box = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const me = useRef<HTMLDivElement>(null);
  const [vs, setVs] = useState<ViewState>({ k: 1, tx: 0, ty: 0 });
  const [picked, setPicked] = useState<{ b: CityBuilding; x: number; z: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: number; pinch: number | null }>({ moved: 0, pinch: null });
  const anne = useMemo(() => BUILDINGS.find((b) => b.game), []);

  const fitK = useCallback(() => {
    const el = box.current;
    if (!el) return 1;
    return Math.min(el.clientWidth / MAP_W, el.clientHeight / MAP_H);
  }, []);

  const clampView = useCallback(
    (v: ViewState): ViewState => {
      const el = box.current;
      if (!el) return v;
      const k = Math.min(fitK() * 4, Math.max(fitK() * 0.95, v.k));
      const w = MAP_W * k;
      const h = MAP_H * k;
      // Keep the map on screen: centre it if it's smaller than the view, else stop at its edges
      const tx = w <= el.clientWidth ? (el.clientWidth - w) / 2 : Math.min(0, Math.max(el.clientWidth - w, v.tx));
      const ty = h <= el.clientHeight ? (el.clientHeight - h) / 2 : Math.min(0, Math.max(el.clientHeight - h, v.ty));
      return { k, tx, ty };
    },
    [fitK],
  );

  const centreOn = useCallback(
    (x: number, z: number, k?: number) => {
      const el = box.current;
      if (!el) return;
      const kk = k ?? Math.max(fitK() * 2.2, 0.6);
      setVs(clampView({ k: kk, tx: el.clientWidth / 2 - X(x) * kk, ty: el.clientHeight / 2 - Z(z) * kk }));
    },
    [clampView, fitK],
  );

  // Mount the painted canvas, start centred on you, track your marker
  useEffect(() => {
    if (!open) return;
    const host = canvasHost.current;
    const c = paintMap();
    if (host && c.parentElement !== host) {
      c.style.display = "block";
      host.appendChild(c);
    }
    const id = requestAnimationFrame(() => centreOn(player.x, player.z));
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (me.current) {
        me.current.style.left = `${X(player.x)}px`;
        me.current.style.top = `${Z(player.z)}px`;
        me.current.style.setProperty("--rot", `${(Math.PI - player.rot) * (180 / Math.PI)}deg`);
      }
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, centreOn, onClose]);

  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const el = box.current;
    if (!el) return;
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    setVs((v) => {
      const k = v.k * factor;
      return clampView({ k, tx: px - ((px - v.tx) / v.k) * k, ty: py - ((py - v.ty) / v.k) * k });
    });
  };

  const toWorld = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    return { x: (clientX - r.left - vs.tx) / vs.k / PPM + B.minX, z: (clientY - r.top - vs.ty) / vs.k / PPM + B.minZ };
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-ink/55 p-3 backdrop-blur-[3px] sm:p-5" onClick={onClose}>
      <div
        className="relative m-auto flex h-full max-h-[880px] w-full max-w-[1280px] animate-pop flex-col overflow-hidden rounded-3xl border-[3px] border-ink bg-cream shadow-[0_6px_0_#1f1a17]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b-[3px] border-ink bg-amber-300 px-3 py-2">
          <span className="grid size-9 place-items-center rounded-xl border-[3px] border-ink bg-cream text-lg">🗺️</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg leading-none font-extrabold text-ink">
              {tr.title} · {tr.area}
            </p>
            <p className="truncate text-[11px] font-bold text-ink/60">{tr.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr.close}
            className="grid size-9 place-items-center rounded-xl border-[3px] border-ink bg-cream text-lg font-extrabold shadow-[0_3px_0_#1f1a17] active:translate-y-0.5"
          >
            ✕
          </button>
        </div>

        {/* Map viewport */}
        <div
          ref={box}
          className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden bg-[#95cf82] select-none active:cursor-grabbing"
          onWheel={(e) => {
            const r = box.current!.getBoundingClientRect();
            zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            drag.current.moved = 0;
            drag.current.pinch = null;
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev) {
              // Hover (mouse): show what's under the cursor
              const w = toWorld(e.clientX, e.clientY);
              const b = BUILDINGS.find((x) => inRect(w.x, w.z, x.rect));
              setPicked((p) => (b ? (p?.b === b ? p : { b, ...w }) : null));
              return;
            }
            const pts = [...pointers.current.values()];
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) {
              // Pinch zoom around the midpoint
              const [a, b] = [...pointers.current.values()];
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (drag.current.pinch) {
                const r = box.current!.getBoundingClientRect();
                zoomAt(d / drag.current.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
              }
              drag.current.pinch = d;
              drag.current.moved += 10;
              return;
            }
            if (pts.length !== 1) return;
            const dx = e.clientX - prev.x;
            const dy = e.clientY - prev.y;
            drag.current.moved += Math.abs(dx) + Math.abs(dy);
            setVs((v) => clampView({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            drag.current.pinch = null;
            if (drag.current.moved < 6) {
              const w = toWorld(e.clientX, e.clientY);
              const b = BUILDINGS.find((x) => inRect(w.x, w.z, x.rect));
              setPicked(b ? { b, ...w } : null);
            }
          }}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        >
          <div className="absolute top-0 left-0 origin-top-left" style={{ width: MAP_W, height: MAP_H, transform: `translate(${vs.tx}px, ${vs.ty}px) scale(${vs.k})` }}>
            <div ref={canvasHost} />
            {anne && <Pin x={(anne.rect.minX + anne.rect.maxX) / 2} z={(anne.rect.minZ + anne.rect.maxZ) / 2} icon="🍵" tone="bg-amber-300" label={tr.anne} />}
            <Pin x={STREETS.busStop.x} z={STREETS.busStop.z} icon="🚌" tone="bg-sky-300" label={tr.bus} />
            {/* You: a pulsing ring with a heading arrow */}
            <div ref={me} className="absolute" style={{ left: X(player.x), top: Z(player.z) }}>
              <span className="absolute size-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-chili/30" />
              <span
                className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-chili shadow-[0_3px_8px_rgba(0,0,0,0.4)]"
                style={{ transform: "translate(-50%, -50%) rotate(var(--rot, 0deg))" }}
              >
                <span className="block h-0 w-0 -translate-y-0.5 border-x-[7px] border-b-[12px] border-x-transparent border-b-white" />
              </span>
            </div>
          </div>

          {/* What you tapped */}
          {picked && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 animate-pop rounded-2xl border-[3px] border-ink bg-cream px-3 py-1.5 text-sm font-extrabold text-ink shadow-[0_4px_0_#1f1a17]">
              {picked.b.game ? "🍵 " : picked.b.kind === "office" ? "🏢 " : picked.b.kind === "mall" ? "🛍️ " : "🏪 "}
              {picked.b.sign}
            </div>
          )}

          {/* Compass */}
          <div className="pointer-events-none absolute top-3 left-3 grid size-12 place-items-center rounded-full border-[3px] border-ink bg-cream shadow-[0_3px_0_#1f1a17]">
            <div className="relative h-8 w-2">
              <span className="absolute top-0 left-0 h-0 w-0 border-x-4 border-b-[14px] border-x-transparent border-b-chili" />
              <span className="absolute bottom-0 left-0 h-0 w-0 border-x-4 border-t-[14px] border-x-transparent border-t-ink/40" />
            </div>
            <span className="absolute -top-0.5 text-[9px] font-extrabold text-chili">U</span>
          </div>

          {/* Zoom + recentre */}
          <div className="absolute right-3 bottom-3 flex flex-col gap-2">
            <MapButton label="+" onClick={() => zoomAt(1.35)} />
            <MapButton label="−" onClick={() => zoomAt(1 / 1.35)} />
            <MapButton label="◎" title={tr.recentre} onClick={() => centreOn(player.x, player.z)} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t-[3px] border-ink bg-cream px-3 py-2 text-xs font-extrabold text-ink">
          <button type="button" onClick={() => centreOn(player.x, player.z)} className="flex items-center gap-1.5 rounded-full bg-chili px-3 py-1 text-white">
            📍 {tr.you}
          </button>
          {anne && (
            <button
              type="button"
              onClick={() => centreOn((anne.rect.minX + anne.rect.maxX) / 2, (anne.rect.minZ + anne.rect.maxZ) / 2)}
              className="flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1"
            >
              🍵 {tr.anne}
            </button>
          )}
          <button type="button" onClick={() => centreOn(STREETS.busStop.x, STREETS.busStop.z)} className="flex items-center gap-1.5 rounded-full bg-sky-300 px-3 py-1">
            🚌 {tr.bus}
          </button>
          <button
            type="button"
            onClick={() => {
              const park = GRID.blocks.find((b) => STREETS.surfaces.some((s) => s.kind === "grass" && s.rect === b.lot));
              if (park) centreOn((park.lot.minX + park.lot.maxX) / 2, (park.lot.minZ + park.lot.maxZ) / 2);
            }}
            className="flex items-center gap-1.5 rounded-full bg-[#8cc979] px-3 py-1"
          >
            ⛲ {tr.park}
          </button>
        </div>
      </div>
    </div>
  );
}
