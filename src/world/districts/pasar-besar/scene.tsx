"use client";

import { memo } from "react";
import { mrtStationById } from "@/content/transit/mrt-hijau";
import { Box, RBox } from "@/shared/three/toon";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { PASAR_BUS_STOP, PASAR_HALL } from "./meta";

export const PasarScene = memo(function PasarScene() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 55]} receiveShadow>
        <planeGeometry args={[28, 30]} />
        <meshLambertMaterial color="#c4b8a0" />
      </mesh>
      {[-10, 0, 10].map((dx, i) => (
        <group key={i} position={[PASAR_HALL.x + dx, 0, PASAR_HALL.z]}>
          <RBox size={[8, 4.5, 14]} radius={0.1} position={[0, 2.25, 0]} color={i === 1 ? "#f2c46b" : "#e8dcc8"} />
          <Box size={[7.5, 0.2, 13]} position={[0, 4.6, 0]} color="#8b4513" outline={false} />
          {[-4, -1, 2].map((dz) => (
            <Box key={dz} size={[2.2, 1.1, 1.4]} position={[0, 0.7, dz]} color="#c8372b" outline={false} />
          ))}
        </group>
      ))}
      <group position={[PASAR_BUS_STOP.x, 0, PASAR_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#f2c46b" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
      <RailStationMesh x={mrtStationById("pasar-besar").x} z={mrtStationById("pasar-besar").z} color="#1f8a4c" />
    </group>
  );
});
