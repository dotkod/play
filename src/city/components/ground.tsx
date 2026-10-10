"use client";

/**
 * Ground layers: grass, asphalt, sidewalks with kerbs, plazas, service lanes, park paths and
 * every road marking. Each layer is one merged mesh with world-space UVs, so textures tile at
 * the same scale everywhere and the whole ground costs a handful of draw calls.
 */

import { memo, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARCADE, asphalt, BUILDINGS, GRID, type Rect, STREETS } from "../plan";
import { surfaceTexture, type SurfaceKind, TILE_M } from "../kit/textures";
import { box, kitMaterial, mergeParts, type Part } from "../kit/merge";

/** Flat rectangles at height y, UVs in world metres / tile size. */
export function rectsGeometry(rects: Rect[], y: number, tile: number) {
  const geos = rects.map((r) => {
    const w = r.maxX - r.minX;
    const d = r.maxZ - r.minZ;
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate((r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
    return g;
  });
  return mergeGeometries(geos);
}

function Layer({ kind, rects, y }: { kind: SurfaceKind; rects: Rect[]; y: number }) {
  const geo = useMemo(() => (rects.length ? rectsGeometry(rects, y, TILE_M[kind]) : null), [kind, rects, y]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} receiveShadow>
      <meshToonMaterial map={surfaceTexture(kind)} />
    </mesh>
  );
}

/** The five-foot way under each shophouse: the strip of the lot between facade line and shop. */
function arcadeFloors(): Rect[] {
  return BUILDINGS.filter((b) => b.arcade).map((b) => {
    const r = b.rect;
    if (b.facing === "n") return { ...r, maxZ: r.minZ + ARCADE };
    if (b.facing === "s") return { ...r, minZ: r.maxZ - ARCADE };
    if (b.facing === "w") return { ...r, maxX: r.minX + ARCADE };
    return { ...r, minX: r.maxX - ARCADE };
  });
}

/** Kerb stones along every sidewalk edge that faces asphalt. */
function kerbParts(): Part[] {
  const parts: Part[] = [];
  const roads = asphalt(GRID);
  const touches = (x: number, z: number) => roads.some((a) => x >= a.minX - 0.05 && x <= a.maxX + 0.05 && z >= a.minZ - 0.05 && z <= a.maxZ + 0.05);
  const K = 0.22;
  for (const s of GRID.sidewalks) {
    const cx = (s.minX + s.maxX) / 2;
    const cz = (s.minZ + s.maxZ) / 2;
    const w = s.maxX - s.minX;
    const d = s.maxZ - s.minZ;
    if (touches(cx, s.minZ - 0.1)) parts.push(box([w, 0.14, K], [cx, 0.07, s.minZ + K / 2], "#c9c4ba", { outline: false }));
    if (touches(cx, s.maxZ + 0.1)) parts.push(box([w, 0.14, K], [cx, 0.07, s.maxZ - K / 2], "#c9c4ba", { outline: false }));
    if (touches(s.minX - 0.1, cz)) parts.push(box([K, 0.14, d], [s.minX + K / 2, 0.07, cz], "#c9c4ba", { outline: false }));
    if (touches(s.maxX + 0.1, cz)) parts.push(box([K, 0.14, d], [s.maxX - K / 2, 0.07, cz], "#c9c4ba", { outline: false }));
  }
  return parts;
}

/** White paint: lane dashes, edge lines, stop lines and zebra stripes. */
function markingRects() {
  const out: Rect[] = [];
  for (const m of STREETS.markings) {
    if (m.kind !== "zebra") {
      out.push(m.rect);
      continue;
    }
    const r = m.rect;
    if (m.axis === "z") {
      for (let z = r.minZ + 0.35; z + 0.5 <= r.maxZ - 0.2; z += 1.0) out.push({ minX: r.minX, maxX: r.maxX, minZ: z, maxZ: z + 0.5 });
    } else {
      for (let x = r.minX + 0.35; x + 0.5 <= r.maxX - 0.2; x += 1.0) out.push({ minX: x, maxX: x + 0.5, minZ: r.minZ, maxZ: r.maxZ });
    }
  }
  return out;
}

export const CityGround = memo(function CityGround() {
  const data = useMemo(() => {
    const kerbs = mergeParts(kerbParts());
    const paint = rectsGeometry(markingRects(), 0.025, 1);
    const B = GRID.bounds;
    const surfaces = STREETS.surfaces;
    return {
      kerbs: kerbs.body,
      paint,
      grass: [B, ...surfaces.filter((s) => s.kind === "grass").map((s) => s.rect)],
      roads: asphalt(GRID),
      sidewalks: GRID.sidewalks,
      plaza: [...surfaces.filter((s) => s.kind === "plaza").map((s) => s.rect), ...arcadeFloors()],
      lanes: surfaces.filter((s) => s.kind === "lane").map((s) => s.rect),
      paths: surfaces.filter((s) => s.kind === "path").map((s) => s.rect),
    };
  }, []);

  return (
    <group>
      <Layer kind="grass" rects={data.grass.slice(0, 1)} y={0} />
      <Layer kind="grass" rects={data.grass.slice(1)} y={0.04} />
      <Layer kind="asphalt" rects={data.roads} y={0.01} />
      <Layer kind="sidewalk" rects={data.sidewalks} y={0.05} />
      <Layer kind="plaza" rects={data.plaza} y={0.045} />
      <Layer kind="lane" rects={data.lanes} y={0.045} />
      <Layer kind="path" rects={data.paths} y={0.055} />
      <mesh geometry={data.kerbs} material={kitMaterial()} receiveShadow />
      <mesh geometry={data.paint}>
        <meshToonMaterial color="#f4f1e8" />
      </mesh>
    </group>
  );
});

