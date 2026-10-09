"use client";

import { memo } from "react";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { LrtStationMesh } from "@/world/lrt-station-mesh";
import { lrtStationById } from "@/content/transit/lrt-kelana";
import { KLCC_BUS_STOP, KLCC_FOUNTAIN, KLCC_PARK, TOWER_L, TOWER_R } from "./meta";

const SILVER = "#c5ced8";
const SILVER_DARK = "#8a96a3";
const GLASS = "#7eb8d4";

/** Stacked tiers approximating Menara Berkembar (parody twin towers). */
function TwinTower({ x, z }: { x: number; z: number }) {
  const tiers = [
    { y: 4, w: 7.2, d: 7.2, h: 8 },
    { y: 12.5, w: 6.4, d: 6.4, h: 9 },
    { y: 22, w: 5.6, d: 5.6, h: 10 },
    { y: 32, w: 4.8, d: 4.8, h: 10 },
    { y: 41.5, w: 4.0, d: 4.0, h: 9 },
    { y: 49, w: 3.2, d: 3.2, h: 6 },
  ];
  return (
    <group position={[x, 0, z]}>
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]} rotation={[0, (i % 2) * 0.2, 0]}>
          <RBox size={[t.w, t.h, t.d]} radius={0.15} color={SILVER} />
          {/* Window band */}
          <Box size={[t.w * 0.92, t.h * 0.55, 0.08]} position={[0, 0.1, t.d / 2 + 0.02]} color={GLASS} outline={false} />
          <Box size={[t.w * 0.92, t.h * 0.55, 0.08]} position={[0, 0.1, -t.d / 2 - 0.02]} color={GLASS} outline={false} />
        </group>
      ))}
      {/* Antenna */}
      <Cyl top={0.08} bottom={0.15} height={8} position={[0, 56, 0]} color={SILVER_DARK} outline={false} />
    </group>
  );
}

export const KlccScene = memo(function KlccScene() {
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      {/* Park lawn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[KLCC_PARK.x, 0.03, KLCC_PARK.z]} receiveShadow>
        <planeGeometry args={[KLCC_PARK.w, KLCC_PARK.d]} />
        <meshLambertMaterial color="#6fba62" />
      </mesh>
      {/* Paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -92]} receiveShadow>
        <planeGeometry args={[3.2, 22]} />
        <meshLambertMaterial color="#d9d5cc" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -88]} receiveShadow>
        <planeGeometry args={[18, 3]} />
        <meshLambertMaterial color="#d9d5cc" />
      </mesh>

      {/* Fountain */}
      <group position={[KLCC_FOUNTAIN.x, 0, KLCC_FOUNTAIN.z]}>
        <Cyl top={3.2} bottom={3.4} height={0.35} position={[0, 0.2, 0]} color="#8ec8e0" />
        <Cyl top={1.6} bottom={1.8} height={0.5} position={[0, 0.55, 0]} color="#bfe6ef" />
        <Cyl top={0.15} bottom={0.2} height={2.4} position={[0, 1.8, 0]} color="#e8f4fa" outline={false} />
        <Box size={[0.08, 1.2, 0.08]} position={[0, 2.6, 0]} color="#ffffff" outline={false} />
      </group>

      <TwinTower x={TOWER_L.x} z={TOWER_L.z} />
      <TwinTower x={TOWER_R.x} z={TOWER_R.z} />

      {/* Skybridge ~40% height */}
      <RBox size={[14, 2.2, 3.2]} radius={0.2} position={[0, 22, TOWER_L.z]} color={SILVER} />
      <Box size={[12, 1.2, 0.1]} position={[0, 22.2, TOWER_L.z + 1.7]} color={GLASS} outline={false} />
      <Box size={[12, 1.2, 0.1]} position={[0, 22.2, TOWER_L.z - 1.7]} color={GLASS} outline={false} />

      {/* Podium / mall stub */}
      <RBox size={[22, 5, 10]} radius={0.2} position={[0, 2.5, -112]} color="#e8eef4" />
      <Box size={[18, 1.8, 0.12]} position={[0, 3.2, -106.9]} color="#1f5fa8" outline={false} />

      <LrtStationMesh x={lrtStationById("klcc").x} z={lrtStationById("klcc").z} />

      {/* Bus stop */}
      <group position={[KLCC_BUS_STOP.x, 0, KLCC_BUS_STOP.z]}>
        <Box size={[4.2, 0.08, 1.4]} position={[0, 0.04, 0]} color="#6b7280" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, -0.4]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, -0.4]} color="#4b5563" outline={false} />
        <Box size={[4, 0.1, 1.2]} position={[0, 2.45, -0.2]} color="#1f5fa8" outline={false} />
        <Box size={[3.6, 0.06, 0.9]} position={[0, 2.52, -0.2]} color="#fcd34d" outline={false} />
      </group>

      {/* Trees around park */}
      {[-14, -7, 7, 14].map((dx) => (
        <group key={dx} position={[dx, 0, -78]}>
          <Cyl top={0.12} bottom={0.16} height={1.5} position={[0, 0.75, 0]} color="#6b4423" />
          <Cyl top={1.0} bottom={1.2} height={1.4} position={[0, 2.1, 0]} color="#2f8f4e" />
        </group>
      ))}
    </group>
  );
});

/** Cheap always-visible skyline when far from KLCC. */
export const KlccSkylineImpostor = memo(function KlccSkylineImpostor() {
  return (
    <group position={[0, 0, -102]}>
      <Box size={[6, 40, 6]} position={[-9, 20, 0]} color={SILVER} outline={false} />
      <Box size={[6, 40, 6]} position={[9, 20, 0]} color={SILVER} outline={false} />
      <Box size={[12, 1.5, 2]} position={[0, 18, 0]} color={SILVER_DARK} outline={false} />
    </group>
  );
});
