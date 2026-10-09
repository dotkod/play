"use client";

import { memo } from "react";
import { mrtStationById } from "@/content/transit/mrt-hijau";
import { Box, RBox } from "@/shared/three/toon";
import { RailStationMesh } from "@/world/rail-station-mesh";
import { PASAR_HALLS } from "./buildings";
import { PASAR_BUS_STOP } from "./meta";

export const PasarScene = memo(function PasarScene() {
  return (
    <group>
      {/* Plaza between halls — asphalt is city ROAD_STRIPS; this is the market pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 60]} receiveShadow>
        <planeGeometry args={[36, 36]} />
        <meshLambertMaterial color="#c4b8a0" />
      </mesh>
      {PASAR_HALLS.map((h) => (
        <group key={h.id} position={[h.x, 0, h.z]}>
          <RBox size={[h.w, h.h, h.d]} radius={0.1} position={[0, h.h / 2, 0]} color={h.color} />
          <Box size={[h.w - 0.5, 0.2, h.d - 1]} position={[0, h.h + 0.1, 0]} color="#8b4513" outline={false} />
          {[-h.d * 0.28, 0, h.d * 0.28].map((dz) => (
            <Box key={dz} size={[2.2, 1.1, 1.4]} position={[h.w * 0.35, 0.7, dz]} color="#c8372b" />
          ))}
        </group>
      ))}
      {/* Bus on the arterial, clear of halls */}
      <group position={[PASAR_BUS_STOP.x, 0, PASAR_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#f2c46b" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
      <RailStationMesh x={mrtStationById("pasar-besar").x} z={mrtStationById("pasar-besar").z} color="#1f8a4c" />
    </group>
  );
});
