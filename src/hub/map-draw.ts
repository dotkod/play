import { RAIL_LINES } from "@/content/transit";
import { WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_X, WORLD_MIN_Z } from "@/world/bounds";
import { BINTIK_STRIP } from "@/world/districts/bukit-bintik/meta";
import { STADIUM } from "@/world/districts/bukit-jalan/meta";
import { KAMPUNG_CENTRE } from "@/world/districts/kampung-lepak/meta";
import { TOWER_L, TOWER_R } from "@/world/districts/klcc/meta";
import { TOWER_POS } from "@/world/districts/menara-lepak/meta";
import { PASAR_HALL } from "@/world/districts/pasar-besar/meta";
import { PETALING_STREET } from "@/world/districts/petaling-lane/meta";
import { SENTRAL_HALL } from "@/world/districts/sentral-lepak/meta";
import { TERRACES } from "@/world/districts/taman-ceria/layout";
import { MENARA_106, TLX_PARK } from "@/world/districts/tlx/meta";
import { ROAD_STRIPS, WALK_PATHS, WALK_PATH_HALF } from "@/world/walk-spine";
import { paintMapGrass, paintMapLandmarks, paintMapLabels, paintMapTrees } from "./map-decor";
import { BUS_STOP } from "./colliders";
import { OUTER_BUS_PLACES, placeById } from "@/content/places";
import { BUILDINGS, doorSpot, footprint, ROAD_HALF, WALK_HALF } from "./world-data";

const PATH = "#cfc8bb";

export const MAP_ORIGIN_X = WORLD_MIN_X;
export const MAP_ORIGIN_Z = WORLD_MIN_Z;
export const MAP_SPAN_X = WORLD_MAX_X - WORLD_MIN_X;
export const MAP_SPAN_Z = WORLD_MAX_Z - WORLD_MIN_Z;

const ROAD = "#4f545a";
const WALK = "#d9d5cc";

/** Round-capped strokes so L-junctions get soft “curls” instead of sharp rectangle corners. */
function strokeStrip(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  k: number,
  strip: (typeof ROAD_STRIPS)[number],
  half: number,
  color: string,
) {
  b.strokeStyle = color;
  b.lineWidth = half * 2 * k;
  b.lineCap = "round";
  b.lineJoin = "round";
  b.beginPath();
  if (strip.axis === "x") {
    b.moveTo(X(Math.min(strip.x0, strip.x1)), Z(strip.z));
    b.lineTo(X(Math.max(strip.x0, strip.x1)), Z(strip.z));
  } else {
    b.moveTo(X(strip.x), Z(Math.min(strip.z0, strip.z1)));
    b.lineTo(X(strip.x), Z(Math.max(strip.z0, strip.z1)));
  }
  b.stroke();
}

function paintStrip(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  k: number,
  strip: (typeof ROAD_STRIPS)[number],
  half: number,
  color: string,
) {
  b.fillStyle = color;
  if (strip.axis === "x") {
    const x0 = Math.min(strip.x0, strip.x1);
    const x1 = Math.max(strip.x0, strip.x1);
    b.fillRect(X(x0), Z(strip.z - half), (x1 - x0) * k, half * 2 * k);
  } else {
    const z0 = Math.min(strip.z0, strip.z1);
    const z1 = Math.max(strip.z0, strip.z1);
    b.fillRect(X(strip.x - half), Z(z0), half * 2 * k, (z1 - z0) * k);
  }
}

export function paintCityBase(
  b: CanvasRenderingContext2D,
  X: (x: number) => number,
  Z: (z: number) => number,
  k: number,
  dpr: number,
) {
  b.fillStyle = "#86c27a";
  b.fillRect(0, 0, b.canvas.width, b.canvas.height);
  paintMapGrass(b, X, Z, k);

  // Soft ground + district plazas UNDER roads (asphalt must stay visible)
  paintMapLandmarks(b, X, Z, k, dpr);
  b.fillStyle = "#6fba62";
  b.fillRect(X(-18), Z(-106), 36 * k, 28 * k);
  b.fillStyle = "#5aa352";
  b.beginPath();
  b.arc(X(-90), Z(-4), 8 * dpr, 0, Math.PI * 2);
  b.fill();
  b.fillStyle = "#7ec8a8";
  b.fillRect(X(TLX_PARK.x - TLX_PARK.w / 2), Z(TLX_PARK.z - TLX_PARK.d / 2), TLX_PARK.w * k, TLX_PARK.d * k);
  b.fillStyle = "#e8c070";
  b.fillRect(X(PASAR_HALL.x) - 8 * dpr, Z(PASAR_HALL.z) - 5 * dpr, 16 * dpr, 10 * dpr);
  b.fillStyle = "#c8d4c0";
  b.beginPath();
  b.ellipse(X(STADIUM.x), Z(STADIUM.z), 12 * dpr, 8 * dpr, 0, 0, Math.PI * 2);
  b.fill();
  b.fillStyle = "#f07178";
  b.fillRect(X(BINTIK_STRIP.x) - 6 * dpr, Z(BINTIK_STRIP.z) - 3 * dpr, 12 * dpr, 6 * dpr);
  b.fillStyle = "#8fbc6e";
  b.fillRect(X(KAMPUNG_CENTRE.x) - 8 * dpr, Z(KAMPUNG_CENTRE.z) - 6 * dpr, 16 * dpr, 12 * dpr);
  b.fillStyle = "#e8a87c";
  b.fillRect(X(PETALING_STREET.x) - 3 * dpr, Z(PETALING_STREET.z) - 8 * dpr, 6 * dpr, 16 * dpr);
  b.fillStyle = "#c5ced8";
  b.fillRect(X(SENTRAL_HALL.x) - 8 * dpr, Z(SENTRAL_HALL.z) - 5 * dpr, 16 * dpr, 10 * dpr);

  // Alleys + round-capped roads (soft L-curls / cul-de-sacs)
  for (const strip of WALK_PATHS) paintStrip(b, X, Z, k, strip, WALK_PATH_HALF, PATH);
  for (const strip of ROAD_STRIPS) strokeStrip(b, X, Z, k, strip, WALK_HALF, WALK);
  for (const strip of ROAD_STRIPS) strokeStrip(b, X, Z, k, strip, ROAD_HALF, ROAD);

  // Landmark icons on top of asphalt
  b.font = `${Math.round(12 * dpr)}px system-ui, sans-serif`;
  b.textAlign = "center";
  b.textBaseline = "middle";
  b.fillStyle = "#c5ced8";
  b.fillRect(X(TOWER_L.x) - 3 * dpr, Z(TOWER_L.z) - 3 * dpr, 6 * dpr, 6 * dpr);
  b.fillRect(X(TOWER_R.x) - 3 * dpr, Z(TOWER_R.z) - 3 * dpr, 6 * dpr, 6 * dpr);
  b.fillStyle = "#1f1a17";
  b.fillText("🏢", X(0), Z(-100));
  b.fillStyle = "#d4dde6";
  b.fillRect(X(TOWER_POS.x) - 2 * dpr, Z(TOWER_POS.z) - 8 * dpr, 4 * dpr, 16 * dpr);
  b.fillStyle = "#1f1a17";
  b.fillText("📡", X(TOWER_POS.x), Z(TOWER_POS.z));
  b.fillStyle = "#a8c4d8";
  b.fillRect(X(MENARA_106.x) - 2.5 * dpr, Z(MENARA_106.z) - 10 * dpr, 5 * dpr, 20 * dpr);
  b.fillStyle = "#1f1a17";
  b.fillText("🏙", X(MENARA_106.x), Z(MENARA_106.z));
  b.fillText("🛒", X(PASAR_HALL.x), Z(PASAR_HALL.z));
  b.fillText("🏟", X(STADIUM.x), Z(STADIUM.z));
  b.fillText("✨", X(BINTIK_STRIP.x), Z(BINTIK_STRIP.z));
  b.fillText("🏡", X(KAMPUNG_CENTRE.x), Z(KAMPUNG_CENTRE.z));
  b.fillText("🛍", X(PETALING_STREET.x), Z(PETALING_STREET.z));
  b.fillText("🚉", X(SENTRAL_HALL.x), Z(SENTRAL_HALL.z));

  // Buildings (after roads so shops sit beside the street, not under broken fills)
  for (const bd of BUILDINGS) {
    const f = footprint(bd);
    b.fillStyle = bd.game || bd.lrt ? "#fcd34d" : bd.soon || bd.interior ? "#fbf3e4" : bd.color;
    b.strokeStyle = "#1f1a17";
    b.lineWidth = 1.5 * dpr;
    b.fillRect(X(f.minX), Z(f.minZ), bd.w * k, bd.d * k);
    b.strokeRect(X(f.minX), Z(f.minZ), bd.w * k, bd.d * k);
    if (bd.game || bd.soon || bd.lrt || bd.interior) {
      const info = bd.game ?? bd.soon ?? bd.interior ?? { emoji: "🚇" };
      b.font = `${Math.round(14 * dpr)}px system-ui, sans-serif`;
      b.textAlign = "center";
      b.textBaseline = "middle";
      b.fillText(info.emoji, X(f.cx), Z(f.cz));
    }
  }
  for (const t of TERRACES) {
    b.fillStyle = t.home ? "#fcd34d" : t.color;
    b.strokeStyle = "#1f1a17";
    b.lineWidth = 1.5 * dpr;
    b.fillRect(X(t.x - t.w / 2), Z(t.z - t.d / 2), t.w * k, t.d * k);
    b.strokeRect(X(t.x - t.w / 2), Z(t.z - t.d / 2), t.w * k, t.d * k);
    if (t.home) {
      b.font = `${Math.round(12 * dpr)}px system-ui, sans-serif`;
      b.textAlign = "center";
      b.fillText("🏠", X(t.x), Z(t.z));
    }
  }
  for (const bd of BUILDINGS.filter((x) => x.game)) {
    const d = doorSpot(bd);
    b.fillStyle = "#d8352a";
    b.beginPath();
    b.arc(X(d.x), Z(d.z), 3 * dpr, 0, Math.PI * 2);
    b.fill();
  }

  paintMapTrees(b, X, Z, k, dpr);

  // Rail stations (LRT / MRT / Monorel) — coloured dots, no route dashes
  for (const line of RAIL_LINES) {
    for (const s of line.stations) {
      b.fillStyle = line.color;
      b.beginPath();
      b.arc(X(s.x), Z(s.z), 5 * dpr, 0, Math.PI * 2);
      b.fill();
      b.font = `${Math.round(9 * dpr)}px system-ui, sans-serif`;
      b.textAlign = "center";
      b.textBaseline = "middle";
      b.fillText(line.emoji, X(s.x), Z(s.z));
    }
  }

  const stops = [BUS_STOP, ...OUTER_BUS_PLACES.map((id) => placeById(id)).filter(Boolean)];
  for (const stop of stops) {
    if (!stop) continue;
    b.fillStyle = "#1f5fa8";
    b.fillRect(X(stop.x) - 6 * dpr, Z(stop.z) - 4 * dpr, 12 * dpr, 8 * dpr);
    b.font = `${Math.round(10 * dpr)}px system-ui, sans-serif`;
    b.textAlign = "center";
    b.textBaseline = "middle";
    b.fillText("🚌", X(stop.x), Z(stop.z));
  }

  // Labels on top so icons don't eat the text
  paintMapLabels(b, X, Z, dpr);
}

export function worldFromCanvas(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  canvas: HTMLCanvasElement,
  ox: number,
  oz: number,
  k: number,
) {
  const scale = canvas.width / rect.width;
  const x = ((clientX - rect.left) * scale + ox) / k + MAP_ORIGIN_X;
  const z = ((clientY - rect.top) * scale + oz) / k + MAP_ORIGIN_Z;
  return {
    x: Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, x)),
    z: Math.max(WORLD_MIN_Z, Math.min(WORLD_MAX_Z, z)),
  };
}
