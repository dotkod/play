"use client";

import { memo } from "react";
import { Box, RBox } from "@/shared/three/toon";
import { mrtStationById } from "@/content/transit/mrt-hijau";
import { monoStationById } from "@/content/transit/monorel";
import { lrtStationById } from "@/content/transit/lrt-kelana";
import { LrtStationMesh } from "@/world/lrt-station-mesh";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { SENTRAL_BUS_STOP, SENTRAL_HALL } from "./meta";

export const SentralScene = memo(function SentralScene() {
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      <group position={[SENTRAL_HALL.x, 0, SENTRAL_HALL.z]}>
        <RBox size={[28, 8, 16]} radius={0.25} position={[0, 4, 0]} color="#e6e9ec" />
        <Box size={[26, 0.3, 14]} position={[0, 8.2, 0]} color="#c5ced8" outline={false} />
        <Box size={[8, 5, 0.2]} position={[0, 3, 8.1]} color="#1f5fa8" outline={false} />
        {/* Platform stubs */}
        {[-6, 0, 6].map((dx) => (
          <Box key={dx} size={[3, 0.4, 20]} position={[dx, 0.3, -2]} color="#6b7280" outline={false} />
        ))}
        <Box size={[22, 0.15, 1.2]} position={[0, 3.2, 0]} color="#d8352a" outline={false} />
        <Box size={[22, 0.15, 1.2]} position={[0, 3.2, -4]} color="#1f8a4c" outline={false} />
      </group>
      <LrtStationMesh x={lrtStationById("sentral-lepak").x} z={lrtStationById("sentral-lepak").z} />
      <RailStationMesh x={mrtStationById("sentral-lepak").x} z={mrtStationById("sentral-lepak").z} color="#1f8a4c" />
      <RailStationMesh x={monoStationById("sentral-lepak").x} z={monoStationById("sentral-lepak").z} color="#a3e635" />
      <group position={[SENTRAL_BUS_STOP.x, 0, SENTRAL_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#1f5fa8" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
    </group>
  );
});
