"use client";

import { memo } from "react";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { LrtStationMesh } from "@/world/lrt-station-mesh";
import { lrtStationById } from "@/content/transit/lrt-kelana";
import { KAMPUNG_BUS_STOP, KAMPUNG_CENTRE } from "./meta";

const WOOD = ["#c4a574", "#b8956a", "#d4b896", "#a8875c"];

export const KampungScene = memo(function KampungScene() {
  const houses = [
    [-8, -4],
    [0, 2],
    [8, -2],
    [-4, 8],
    [6, 10],
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-58, 0.02, 45]} receiveShadow>
        <planeGeometry args={[36, 36]} />
        <meshLambertMaterial color="#7cbc6e" />
      </mesh>
      {houses.map(([dx, dz], i) => (
        <group key={i} position={[KAMPUNG_CENTRE.x + dx, 0.9, KAMPUNG_CENTRE.z + dz]}>
          <Cyl top={0.12} bottom={0.12} height={1.6} position={[-1.8, 0, -1.4]} color="#6b4423" outline={false} />
          <Cyl top={0.12} bottom={0.12} height={1.6} position={[1.8, 0, -1.4]} color="#6b4423" outline={false} />
          <Cyl top={0.12} bottom={0.12} height={1.6} position={[-1.8, 0, 1.4]} color="#6b4423" outline={false} />
          <Cyl top={0.12} bottom={0.12} height={1.6} position={[1.8, 0, 1.4]} color="#6b4423" outline={false} />
          <RBox size={[4.2, 2.4, 3.4]} radius={0.08} position={[0, 2, 0]} color={WOOD[i % WOOD.length]} />
          <Box size={[4.8, 0.15, 3.8]} position={[0, 3.3, 0]} rotation={[0, 0.2, 0.05]} color="#8b4513" outline={false} />
        </group>
      ))}
      <LrtStationMesh x={lrtStationById("kampung-lepak").x} z={lrtStationById("kampung-lepak").z} />
      <group position={[KAMPUNG_BUS_STOP.x, 0, KAMPUNG_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#c4a574" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
    </group>
  );
});
