"use client";

import { memo } from "react";
import { mrtStationById } from "@/content/transit/mrt-hijau";
import { monoStationById } from "@/content/transit/monorel";
import { Box, RBox } from "@/shared/three/toon";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { BINTIK_BLOCKS, BINTIK_BUS_STOP } from "./meta";

const NEON = ["#ff5a7a", "#64d2ff", "#ffd60a", "#bf5af2", "#30d158"];

export const BintikScene = memo(function BintikScene() {
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      {BINTIK_BLOCKS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <RBox size={[b.w, 8 + (i % 3), b.d]} radius={0.1} position={[0, 4 + (i % 3) / 2, 0]} color="#2a2a33" />
          <Box size={[5.2, 1.2, 0.12]} position={[0, 6, 3.1]} color={NEON[i % NEON.length]} outline={false} />
          <Box size={[4, 0.6, 0.1]} position={[0, 4.2, 3.15]} color="#ffffff" outline={false} />
        </group>
      ))}
      <group position={[BINTIK_BUS_STOP.x, 0, BINTIK_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#ff5a7a" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
      <RailStationMesh x={mrtStationById("bukit-bintik").x} z={mrtStationById("bukit-bintik").z} color="#1f8a4c" />
      <RailStationMesh x={monoStationById("bukit-bintik").x} z={monoStationById("bukit-bintik").z} color="#a3e635" />
    </group>
  );
});
