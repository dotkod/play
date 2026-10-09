"use client";

import { memo } from "react";
import { mrtStationById } from "@/content/transit/mrt-hijau";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { MENARA_106, TLX_BUS_STOP, TLX_PARK } from "./meta";

const GLASS = "#9ec8e0";
const STEEL = "#b8c4d0";

export const TlxScene = memo(function TlxScene() {
  const tiers = [8, 10, 12, 12, 11, 10, 9, 8, 7, 6];
  let y = 4;
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TLX_PARK.x, 0.03, TLX_PARK.z]} receiveShadow>
        <planeGeometry args={[TLX_PARK.w, TLX_PARK.d]} />
        <meshLambertMaterial color="#6fba62" />
      </mesh>
      <group position={[MENARA_106.x, 0, MENARA_106.z]}>
        <RBox size={[14, 4, 14]} radius={0.2} position={[0, 2, 0]} color="#e8eef4" />
        {tiers.map((h, i) => {
          const yy = y + h / 2;
          y += h;
          const w = 9 - i * 0.45;
          return <RBox key={i} size={[w, h, w]} radius={0.1} position={[0, yy, 0]} color={i % 2 ? GLASS : STEEL} />;
        })}
        <Box size={[5, 2, 5]} position={[0, y + 1, 0]} color="#f0d060" outline={false} />
      </group>
      <group position={[TLX_BUS_STOP.x, 0, TLX_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#5e5ce6" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
      <Cyl top={0.9} bottom={1.1} height={1.2} position={[64, 1.9, -74]} color="#2f8f4e" />
      <RailStationMesh x={mrtStationById("tlx").x} z={mrtStationById("tlx").z} color="#1f8a4c" />
    </group>
  );
});

export const TlxSkylineImpostor = memo(function TlxSkylineImpostor() {
  return (
    <group position={[MENARA_106.x, 0, MENARA_106.z]}>
      <Box size={[6, 52, 6]} position={[0, 26, 0]} color={STEEL} outline={false} />
      <Box size={[4, 2, 4]} position={[0, 53, 0]} color="#f0d060" outline={false} />
    </group>
  );
});
