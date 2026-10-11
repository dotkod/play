"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cachedParts, hullMaterial, kitMaterial } from "@/city/kit/merge";
import { liftCabinParts, liftDoorLeafParts } from "../kit/lift-cabin";
import { PLATFORM_Y, type LrtStation } from "../plan";
import { liftByStation } from "../sim/lift";

const DOOR_W = 0.72;
const DOOR_H = 2.2;
const SLIDE = 0.78; // how far each leaf slides when open

export function StationLift({ st }: { st: LrtStation }) {
  const w = st.lift.maxX - st.lift.minX;
  const d = st.lift.maxZ - st.lift.minZ;
  const cabin = useMemo(
    () => cachedParts(`lrt-lift-cabin-v2-${st.id}`, () => liftCabinParts(w, d), 0.02),
    [st.id, w, d],
  );
  const leaf = useMemo(
    () => cachedParts(`lrt-lift-door-v2-${st.id}`, () => liftDoorLeafParts(DOOR_W, DOOR_H), 0.02),
    [st.id],
  );
  const cabinG = useRef<THREE.Group>(null);
  const doorsN = useRef<THREE.Group>(null);
  const doorsS = useRef<THREE.Group>(null);
  const cx = (st.lift.minX + st.lift.maxX) / 2;
  const cz = (st.lift.minZ + st.lift.maxZ) / 2;

  useFrame(() => {
    const L = liftByStation[st.id];
    if (!L) return;
    if (cabinG.current) cabinG.current.position.y = L.y;
    // door=1 open → leaves slide apart; door=0 closed → centre
    const open = L.door;
    const slide = open * SLIDE;
    if (doorsN.current) {
      doorsN.current.children[0]!.position.x = -DOOR_W / 2 - slide;
      doorsN.current.children[1]!.position.x = DOOR_W / 2 + slide;
      // Show platform-level doors when cabin is at deck (and street doors at street)
      doorsN.current.visible = L.y > PLATFORM_Y * 0.45 || L.moving;
      doorsN.current.position.y = PLATFORM_Y;
    }
    if (doorsS.current) {
      doorsS.current.children[0]!.position.x = -DOOR_W / 2 - slide;
      doorsS.current.children[1]!.position.x = DOOR_W / 2 + slide;
      doorsS.current.visible = L.y < PLATFORM_Y * 0.55 || L.moving;
      doorsS.current.position.y = 0;
    }
  });

  return (
    <group>
      <group ref={cabinG} position={[cx, 0, cz]}>
        <mesh geometry={cabin.body} material={kitMaterial()} castShadow receiveShadow />
        {cabin.hull && <mesh geometry={cabin.hull} material={hullMaterial()} />}
      </group>
      {/* North doors (platform side) */}
      <group ref={doorsN} position={[cx, PLATFORM_Y, st.lift.minZ - 0.02]}>
        <group position={[-DOOR_W / 2, 0, 0]}>
          <mesh geometry={leaf.body} material={kitMaterial()} castShadow />
          {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
        </group>
        <group position={[DOOR_W / 2, 0, 0]}>
          <mesh geometry={leaf.body} material={kitMaterial()} castShadow />
          {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
        </group>
      </group>
      {/* South doors (street side) */}
      <group ref={doorsS} position={[cx, 0, st.lift.maxZ + 0.02]}>
        <group position={[-DOOR_W / 2, 0, 0]}>
          <mesh geometry={leaf.body} material={kitMaterial()} castShadow />
          {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
        </group>
        <group position={[DOOR_W / 2, 0, 0]}>
          <mesh geometry={leaf.body} material={kitMaterial()} castShadow />
          {leaf.hull && <mesh geometry={leaf.hull} material={hullMaterial()} />}
        </group>
      </group>
    </group>
  );
}
