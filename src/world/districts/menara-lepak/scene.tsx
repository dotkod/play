"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import type * as THREE from "three";
import { monoStationById } from "@/content/transit/monorel";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { presetForFrac } from "../../lighting";
import { MENARA_BUS_STOP, MENARA_HILL, TOWER_POS } from "./meta";

const SHAFT = "#d4dde6";
const POD = "#c8d0da";
const STEEL = "#8a96a3";

function AircraftLights({ y }: { y: number }) {
  const a = useRef<THREE.MeshBasicMaterial>(null);
  const b = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const night = presetForFrac().windows;
    const on = night && Math.sin(clock.elapsedTime * 3.2) > 0;
    const col = on ? "#ff2a2a" : "#3a2020";
    a.current?.color.set(col);
    b.current?.color.set(col);
  });
  return (
    <>
      <mesh position={[-0.35, y, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshBasicMaterial ref={a} color="#3a2020" toneMapped={false} />
      </mesh>
      <mesh position={[0.35, y, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshBasicMaterial ref={b} color="#3a2020" toneMapped={false} />
      </mesh>
    </>
  );
}

function MenaraTower() {
  return (
    <group position={[TOWER_POS.x, 3.2, TOWER_POS.z]}>
      {/* Base / podium */}
      <RBox size={[10, 3.2, 10]} radius={0.2} position={[0, 1.6, 0]} color="#e8eef4" />
      {/* Shaft */}
      <Cyl top={2.4} bottom={3.2} height={28} position={[0, 17.5, 0]} color={SHAFT} />
      <Cyl top={1.9} bottom={2.4} height={14} position={[0, 38.5, 0]} color={SHAFT} />
      {/* Observation bulb */}
      <Cyl top={4.2} bottom={3.6} height={3.2} position={[0, 47.5, 0]} color={POD} />
      <Cyl top={3.4} bottom={4.2} height={2.4} position={[0, 50.2, 0]} color={POD} />
      <Cyl top={2.2} bottom={3.4} height={2} position={[0, 52.4, 0]} color={STEEL} />
      {/* Antenna */}
      <Cyl top={0.12} bottom={0.35} height={12} position={[0, 59.5, 0]} color={STEEL} outline={false} />
      <AircraftLights y={53.8} />
      <AircraftLights y={65} />
    </group>
  );
}

export const MenaraScene = memo(function MenaraScene() {
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      {/* Hill */}
      <mesh position={[MENARA_HILL.x, 0.5, MENARA_HILL.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[MENARA_HILL.r, 32]} />
        <meshLambertMaterial color="#6fba62" />
      </mesh>
      <Cyl top={16} bottom={20} height={3.2} position={[MENARA_HILL.x, 1.6, MENARA_HILL.z]} color="#5aa352" outline={false} />

      <MenaraTower />

      {/* Lookout plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-78, 3.25, 6]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshLambertMaterial color="#d9d5cc" />
      </mesh>
      <Box size={[0.8, 0.9, 0.4]} position={[-74, 3.7, 8]} color="#8b7355" outline={false} />

      {/* Bus stop */}
      <group position={[MENARA_BUS_STOP.x, 0, MENARA_BUS_STOP.z]}>
        <Box size={[4.2, 0.08, 1.4]} position={[0, 0.04, 0]} color="#6b7280" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, -0.4]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, -0.4]} color="#4b5563" outline={false} />
        <Box size={[4, 0.1, 1.2]} position={[0, 2.45, -0.2]} color="#c8372b" outline={false} />
        <Box size={[3.6, 0.06, 0.9]} position={[0, 2.52, -0.2]} color="#fcd34d" outline={false} />
      </group>

      {/* Trees on hill ring */}
      {[-14, -8, 8, 14].map((dx, i) => (
        <group key={i} position={[MENARA_HILL.x + dx, 3.2, MENARA_HILL.z + (i % 2 === 0 ? 10 : -12)]}>
          <Cyl top={0.12} bottom={0.16} height={1.4} position={[0, 0.7, 0]} color="#6b4423" />
          <Cyl top={0.9} bottom={1.1} height={1.3} position={[0, 1.9, 0]} color="#2f8f4e" />
        </group>
      ))}
      <RailStationMesh x={monoStationById("menara-lepak").x} z={monoStationById("menara-lepak").z} color="#a3e635" />
    </group>
  );
});

/** Far skyline stub — shaft + bulb. */
export const MenaraSkylineImpostor = memo(function MenaraSkylineImpostor() {
  return (
    <group position={[TOWER_POS.x, 0, TOWER_POS.z]}>
      <Cyl top={1.6} bottom={2.2} height={36} position={[0, 21, 0]} color={SHAFT} outline={false} />
      <Cyl top={2.8} bottom={2.4} height={4} position={[0, 41, 0]} color={POD} outline={false} />
      <Cyl top={0.1} bottom={0.25} height={8} position={[0, 47, 0]} color={STEEL} outline={false} />
    </group>
  );
});
