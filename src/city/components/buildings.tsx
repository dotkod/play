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
import { cityCamera } from "./camera-override";
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

/**
 * Where the 2D segment a→b leaves the rectangle, as t in [0, 1], or null if it misses
 * (slab test). The camera ray slopes down, so it is lowest where it leaves.
 */
function segmentExit(ax: number, az: number, bx: number, bz: number, r: Rect): number | null {
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
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return t1;
}

/** Faded copy of the shared kit material, one per building group so each can fade alone. */
function fadeMaterial() {
  const m = kitMaterial().clone();
  m.transparent = true;
  return m;
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

  const body = useRef<THREE.Mesh>(null);
  const hull = useRef<THREE.Mesh>(null);
  const sign = useRef<THREE.Group>(null);
  const faded = useRef<THREE.MeshToonMaterial | null>(null);
  const root = useRef<THREE.Group>(null);
  const isMamak = g.members.some((m) => m.kind === "mamak");
  const opacity = useRef(1);

  useFrame(({ camera }, delta) => {
    // Serving inside Anne Maju: its shell would sit between the camera and the room
    if (root.current) root.current.visible = !(isMamak && cityCamera.shot);
    // See-through only when this group truly blocks the view of the player: the camera ray
    // is still below the roofline where it leaves the footprint (looking over a low roof is fine)
    const t = segmentExit(camera.position.x, camera.position.z, player.x, player.z, g.rect);
    const eyeH = camera.position.y + (1.6 - camera.position.y) * (t ?? 1);
    const blocks = t !== null && eyeH < g.height + 0.5;
    const want = blocks ? 0.18 : 1;
    opacity.current += (want - opacity.current) * Math.min(1, delta * 10);
    const solid = opacity.current > 0.98;
    faded.current ??= fadeMaterial();
    faded.current.opacity = opacity.current;
    faded.current.depthWrite = solid;
    if (body.current) body.current.material = solid ? kitMaterial() : faded.current;
    if (hull.current) hull.current.visible = solid;
    if (sign.current) sign.current.visible = opacity.current > 0.6;
    if (glow.current) glow.current.visible = solid && presetForFrac().windows;
  });

  return (
    <group ref={root}>
      <mesh ref={body} geometry={geo.body} material={kitMaterial()} castShadow={!isMamak} receiveShadow />
      {geo.hull && <mesh ref={hull} geometry={geo.hull} material={hullMaterial()} />}
      {geo.glow && <mesh ref={glow} geometry={geo.glow} material={glowMaterial()} visible={false} />}
      <group ref={sign}>
        <RowSign g={g} />
      </group>
    </group>
  );
});

/** Enterable doors get a glowing mat and a bobbing arrow so you can find the way in. */
function DoorMarker({ b }: { b: CityBuilding }) {
  const ring = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Hidden while a job has the camera (you're already inside)
    if (root.current) root.current.visible = !cityCamera.shot;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    if (arrow.current) arrow.current.position.y = 2.6 + Math.sin(t * 2.4) * 0.18;
  });
  return (
    <group ref={root} position={[b.door.x, 0, b.door.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.85, 1.1, 40]} />
        <meshBasicMaterial color="#fcd34d" toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <group ref={arrow}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.32, 0.6, 4]} />
          <meshBasicMaterial color="#fcd34d" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export const CityBuildings = memo(function CityBuildings() {
  const list = useMemo(() => groups(), []);
  const doors = useMemo(() => BUILDINGS.filter((b) => b.game), []);
  return (
    <group>
      {list.map((g) => (
        <BuildingGroup key={g.id} g={g} />
      ))}
      {doors.map((b) => (
        <DoorMarker key={b.id} b={b} />
      ))}
    </group>
  );
});

/** For other systems (minimap, tests): every group's footprint. */
export function buildingGroups() {
  return groups();
}
