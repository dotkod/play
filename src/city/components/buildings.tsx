"use client";

/**
 * All buildings. Each shophouse row (or tower) is one merged mesh + outline + night-glow mesh +
 * one sign strip, so the city stays cheap to draw. Rows between the camera and the player are
 * hidden (cutaway) so you can always see yourself.
 */

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { player } from "@/world/player-bridge";
import { presetForFrac } from "@/world/lighting";
import { BUILDINGS, buildingHeight, type CityBuilding, GROUND_H, type Rect } from "../plan";
import { buildingParts, signStrip } from "../kit/buildings";
import { glowMaterial, hullMaterial, kitMaterial, mergeGlow, mergeParts } from "../kit/merge";
import { labelTexture, rowSignTexture } from "../kit/textures";

type Group = {
  id: string;
  members: CityBuilding[];
  rect: Rect;
  height: number;
};

function groups(): Group[] {
  const map = new Map<string, CityBuilding[]>();
  for (const b of BUILDINGS) map.set(b.group, [...(map.get(b.group) ?? []), b]);
  return [...map.entries()].map(([id, members]) => ({
    id,
    members,
    rect: {
      minX: Math.min(...members.map((m) => m.rect.minX)),
      maxX: Math.max(...members.map((m) => m.rect.maxX)),
      minZ: Math.min(...members.map((m) => m.rect.minZ)),
      maxZ: Math.max(...members.map((m) => m.rect.maxZ)),
    },
    height: Math.max(...members.map(buildingHeight)),
  }));
}

/** Does the 2D segment a→b cross the rectangle (slab test)? */
function segmentHitsRect(ax: number, az: number, bx: number, bz: number, r: Rect) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, q] of [
    [-dx, ax - r.minX],
    [dx, r.maxX - ax],
    [-dz, az - r.minZ],
    [dz, r.maxZ - az],
  ]) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

function RowSign({ g }: { g: Group }) {
  const sign = useMemo(() => {
    const first = g.members[0];
    if (first.kind === "office" || first.kind === "mall") {
      const s = signStrip(first);
      const w = Math.min(14, s.width * 0.7);
      return { tex: labelTexture(first.sign, first.signBg, first.signFg, w / 1.4), pos: [s.pos[0], GROUND_H + 1.4, s.pos[2]] as const, rotY: s.rotY, w, h: 1.4 };
    }
    // Row fascia: slots measured along the frontage as seen from the street
    const r = g.rect;
    const facing = first.facing;
    const length = facing === "n" || facing === "s" ? r.maxX - r.minX : r.maxZ - r.minZ;
    // Canvas x runs left-to-right as seen by someone facing the shop: east end first for
    // north-facing rows (the plane is turned around), west end first for south-facing rows
    const slots = g.members.map((b) => {
      const w = b.rect.maxX - b.rect.minX;
      const from = facing === "n" ? r.maxX - b.rect.maxX : b.rect.minX - r.minX;
      return { from, to: from + w, text: b.sign, bg: b.signBg, fg: b.signFg };
    });
    const pseudo: CityBuilding = { ...first, rect: r };
    const s = signStrip(pseudo);
    return { tex: rowSignTexture(g.id, length, slots), pos: s.pos, rotY: s.rotY, w: length, h: s.height };
  }, [g]);
  return (
    <mesh position={sign.pos as unknown as THREE.Vector3Tuple} rotation={[0, sign.rotY, 0]}>
      <planeGeometry args={[sign.w, sign.h]} />
      <meshBasicMaterial map={sign.tex} toneMapped={false} />
    </mesh>
  );
}

const BuildingGroup = memo(function BuildingGroup({ g }: { g: Group }) {
  const root = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const all = g.members.map(buildingParts);
    const merged = mergeParts(
      all.flatMap((a) => a.parts),
      0.045,
    );
    const lit = all.flatMap((a) => a.glow);
    return { ...merged, glow: lit.length ? mergeGlow(lit) : null };
  }, [g]);

  useFrame(({ camera }) => {
    if (!root.current) return;
    // Cutaway: hide the row if it stands between the camera and the player
    const inside = player.x > g.rect.minX && player.x < g.rect.maxX && player.z > g.rect.minZ && player.z < g.rect.maxZ;
    const r = { minX: g.rect.minX - 0.6, maxX: g.rect.maxX + 0.6, minZ: g.rect.minZ - 0.6, maxZ: g.rect.maxZ + 0.6 };
    const blocks = !inside && segmentHitsRect(camera.position.x, camera.position.z, player.x, player.z, r);
    root.current.visible = !blocks;
    if (glow.current) glow.current.visible = presetForFrac().windows;
  });

  return (
    <group ref={root}>
      <mesh geometry={geo.body} material={kitMaterial()} castShadow receiveShadow />
      {geo.hull && <mesh geometry={geo.hull} material={hullMaterial()} />}
      {geo.glow && <mesh ref={glow} geometry={geo.glow} material={glowMaterial()} visible={false} />}
      <RowSign g={g} />
    </group>
  );
});

export const CityBuildings = memo(function CityBuildings() {
  const list = useMemo(() => groups(), []);
  return (
    <group>
      {list.map((g) => (
        <BuildingGroup key={g.id} g={g} />
      ))}
    </group>
  );
});

/** For other systems (minimap, tests): every group's footprint. */
export function buildingGroups() {
  return groups();
}
