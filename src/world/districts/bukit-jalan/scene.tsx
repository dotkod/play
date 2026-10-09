"use client";

import { memo } from "react";
import { mrtStationById } from "@/content/transit/mrt-hijau";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { JALAN_BUS_STOP, STADIUM } from "./meta";

export const JalanScene = memo(function JalanScene() {
  return (
    <group>
      {/* Arterial asphalt from City ROAD_STRIPS */}
      {/* Car park */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[28, 0.02, 70]} receiveShadow>
        <planeGeometry args={[18, 22]} />
        <meshLambertMaterial color="#5a6068" />
      </mesh>
      <group position={[STADIUM.x, 0, STADIUM.z]}>
        <Cyl top={18} bottom={20} height={4} position={[0, 2, 0]} color="#e8eef4" />
        <Cyl top={14} bottom={16} height={6} position={[0, 7, 0]} color="#f4f6f8" />
        <Cyl top={12} bottom={12} height={0.4} position={[0, 10.2, 0]} color="#ffffff" outline={false} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2;
          return <Cyl key={i} top={0.15} bottom={0.2} height={8} position={[Math.cos(a) * 16, 8, Math.sin(a) * 16]} color="#d0d5dc" outline={false} />;
        })}
        <RBox size={[8, 3, 4]} radius={0.15} position={[0, 1.5, 20]} color="#c8372b" />
      </group>
      <group position={[JALAN_BUS_STOP.x, 0, JALAN_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#1f8a4c" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
      <RailStationMesh x={mrtStationById("bukit-jalan").x} z={mrtStationById("bukit-jalan").z} color="#1f8a4c" />
    </group>
  );
});
