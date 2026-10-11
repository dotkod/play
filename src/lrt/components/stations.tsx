"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cachedParts, hullMaterial, kitMaterial } from "@/city/kit/merge";
import { player } from "@/world/player-bridge";
import {
  gateFlapParts,
  gateParts,
  guidewayParts,
  platformDoorLeafParts,
  platformSideScreenParts,
  stationBodyParts,
  stationRoofParts,
} from "../kit";
import { DOOR_HALF, PLAT_EDGE_Z, PLATFORM_Y, STATIONS, type LrtStation, type Rect } from "../plan";
import { platformDoorsOpen } from "../sim/shuttle";
import { gateOpen } from "./gate-state";
import { StationNameBoards } from "./name-board";
import { StationPid } from "./pid";

export { gateOpen };

function fadeMaterial() {
  const m = kitMaterial().clone();
  m.transparent = true;
  return m;
}

/** Where camera→player leaves a cover rect (t in 0..1), or null. */
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

function StationMesh({ stX, id }: { stX: number; id: string }) {
  const body = useMemo(() => cachedParts(`lrt-st-body-v5-${id}`, () => stationBodyParts(stX), 0.025), [stX, id]);
  const roof = useMemo(() => cachedParts(`lrt-st-roof-v5-${id}`, () => stationRoofParts(stX), 0.025), [stX, id]);
  const roofMesh = useRef<THREE.Mesh>(null);
  const roofHull = useRef<THREE.Mesh>(null);
  const faded = useRef<THREE.MeshToonMaterial | null>(null);
  const opacity = useRef(1);
  const st = STATIONS.find((s) => s.id === id)!;

  useFrame(({ camera }, delta) => {
    // Fade roofs when they sit between the camera and the player (city cutaway pattern)
    let blocks = false;
    for (const c of st.covers) {
      const t = segmentExit(camera.position.x, camera.position.z, player.x, player.z, c.rect);
      const eyeH = camera.position.y + (1.6 - camera.position.y) * (t ?? 1);
      if (t !== null && eyeH < c.top + 0.3) {
        blocks = true;
        break;
      }
    }
    // Also fade when the player is under this station's cover
    const under = st.covers.some((c) => player.x >= c.rect.minX && player.x <= c.rect.maxX && player.z >= c.rect.minZ && player.z <= c.rect.maxZ);
    const want = blocks || under ? 0.12 : 1;
    opacity.current += (want - opacity.current) * Math.min(1, delta * 10);
    const solid = opacity.current > 0.98;
    faded.current ??= fadeMaterial();
    faded.current.opacity = opacity.current;
    faded.current.depthWrite = solid;
    if (roofMesh.current) roofMesh.current.material = solid ? kitMaterial() : faded.current;
    if (roofHull.current) roofHull.current.visible = solid;
  });

  return (
    <>
      <mesh geometry={body.body} material={kitMaterial()} castShadow receiveShadow />
      {body.hull && <mesh geometry={body.hull} material={hullMaterial()} />}
      <mesh ref={roofMesh} geometry={roof.body} material={kitMaterial()} castShadow />
      {roof.hull && <mesh ref={roofHull} geometry={roof.hull} material={hullMaterial()} />}
    </>
  );
}

function FareGate({ x, z, id, alwaysOpen }: { x: number; z: number; id?: string; alwaysOpen?: boolean }) {
  const flap = useRef<THREE.Group>(null);
  const cabinet = useMemo(() => cachedParts("lrt-gate", gateParts, 0.02), []);
  const leaf = useMemo(() => cachedParts("lrt-flap", gateFlapParts, 0.02), []);
  useFrame(() => {
    if (!flap.current) return;
    const open = alwaysOpen || (!!id && gateOpen[id]);
    const want = open ? Math.PI / 2 : 0;
    flap.current.rotation.y += (want - flap.current.rotation.y) * 0.18;
  });
  return (
    <group position={[x, PLATFORM_Y, z]}>
      <mesh geometry={cabinet.body} material={kitMaterial()} castShadow />
      {cabinet.hull && <mesh geometry={cabinet.hull} material={hullMaterial()} />}
      <group ref={flap}>
        <mesh geometry={leaf.body} material={kitMaterial()} />
        {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
      </group>
    </group>
  );
}

/** Track-edge screen doors: closed by default, open with the train doors at this stop. */
function PlatformScreenDoors({ st }: { st: LrtStation }) {
  const platZ = PLAT_EDGE_Z;
  const sides = useMemo(
    () => cachedParts(`lrt-psd-sides-v2-${st.id}`, () => platformSideScreenParts(st.x, platZ, PLATFORM_Y), 0.02),
    [st.id, st.x, platZ],
  );
  const leaf = useMemo(() => cachedParts("lrt-psd-leaf-v2", platformDoorLeafParts, 0.02), []);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const openAmt = useRef(0);

  useFrame((_, delta) => {
    const want = platformDoorsOpen(st.id) ? 1 : 0;
    openAmt.current += (want - openAmt.current) * Math.min(1, delta * 5);
    const slide = openAmt.current * (DOOR_HALF + 0.15);
    if (left.current) left.current.position.x = st.x - DOOR_HALF / 2 - slide;
    if (right.current) right.current.position.x = st.x + DOOR_HALF / 2 + slide;
  });

  return (
    <>
      <mesh geometry={sides.body} material={kitMaterial()} castShadow />
      {sides.hull && <mesh geometry={sides.hull} material={hullMaterial()} />}
      <group ref={left} position={[st.x - DOOR_HALF / 2, PLATFORM_Y, platZ]}>
        <mesh geometry={leaf.body} material={kitMaterial()} />
        {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
      </group>
      <group ref={right} position={[st.x + DOOR_HALF / 2, PLATFORM_Y, platZ]}>
        <mesh geometry={leaf.body} material={kitMaterial()} />
        {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
      </group>
    </>
  );
}

export function LrtStations() {
  const guide = useMemo(() => cachedParts("lrt-guide", guidewayParts, 0.03), []);
  return (
    <>
      <mesh geometry={guide.body} material={kitMaterial()} castShadow receiveShadow />
      {guide.hull && <mesh geometry={guide.hull} material={hullMaterial()} />}
      {STATIONS.map((st) => (
        <group key={st.id}>
          <StationMesh stX={st.x} id={st.id} />
          <PlatformScreenDoors st={st} />
          <FareGate x={st.entryGate.x} z={st.entryGate.z} id={st.id} />
          <FareGate x={st.exitGate.x} z={st.exitGate.z} alwaysOpen />
          <StationPid st={st} />
          <StationNameBoards st={st} />
        </group>
      ))}
    </>
  );
}
