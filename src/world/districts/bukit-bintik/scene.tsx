"use client";

import { memo } from "react";
import { Box, RBox } from "@/shared/three/toon";
import { BINTIK_BUS_STOP, BINTIK_STRIP } from "./meta";

const NEON = ["#ff5a7a", "#64d2ff", "#ffd60a", "#bf5af2", "#30d158"];

export const BintikScene = memo(function BintikScene() {
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      {[-8, -2, 4, 10].map((dx, i) => (
        <group key={i} position={[BINTIK_STRIP.x + dx, 0, BINTIK_STRIP.z]}>
          <RBox size={[5.5, 8 + (i % 3), 6]} radius={0.1} position={[0, 4 + (i % 3) / 2, 0]} color="#2a2a33" />
          <Box size={[5.2, 1.2, 0.12]} position={[0, 6, 3.1]} color={NEON[i % NEON.length]} outline={false} />
          <Box size={[4, 0.6, 0.1]} position={[0, 4.2, 3.15]} color="#ffffff" outline={false} />
        </group>
      ))}
      <group position={[BINTIK_BUS_STOP.x, 0, BINTIK_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#ff5a7a" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
    </group>
  );
});
