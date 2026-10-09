"use client";

import { memo } from "react";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { PLAYGROUND, TERRACES } from "./layout";
import { LrtStationMesh } from "@/world/lrt-station-mesh";
import { lrtStationById } from "@/content/transit/lrt-kelana";
import { TAMAN_BUS_STOP, TAMAN_SOFA } from "./meta";

export const TamanScene = memo(function TamanScene() {
  return (
    <group>
      {/* Roads/sidewalks come from hub CityRoadStrips (ROAD_STRIPS) — no duplicate planes */}
      {TERRACES.map((t) => (
        <group key={t.id} position={[t.x, 0, t.z]}>
          <RBox size={[t.w, t.h, t.d]} radius={0.08} position={[0, t.h / 2, 0]} color={t.color} />
          <Box size={[t.w * 0.9, 0.15, 0.8]} position={[0, 0.08, t.d / 2 + 0.3]} color="#8b7355" outline={false} />
          {t.home && (
            <>
              {/* Sofa outside porch — sit target */}
              <group position={[0, 0, TAMAN_SOFA.z - t.z]}>
                <Box size={[1.6, 0.45, 0.7]} position={[0, 0.35, 0]} color="#c45c4a" />
                <Box size={[1.6, 0.55, 0.2]} position={[0, 0.7, -0.3]} color="#a3483a" />
              </group>
              <mesh position={[0, t.h + 0.4, 0]}>
                <planeGeometry args={[2.2, 0.5]} />
                <meshBasicMaterial color="#1f1a17" toneMapped={false} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Playground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PLAYGROUND.x, 0.03, PLAYGROUND.z]} receiveShadow>
        <planeGeometry args={[PLAYGROUND.w, PLAYGROUND.d]} />
        <meshLambertMaterial color="#7cbc6e" />
      </mesh>
      <Cyl top={0.08} bottom={0.12} height={2.2} position={[PLAYGROUND.x - 2, 1.1, PLAYGROUND.z]} color="#e85d4c" />
      <Cyl top={0.9} bottom={0.9} height={0.08} position={[PLAYGROUND.x - 2, 2.2, PLAYGROUND.z]} color="#f0c14a" />
      <Box size={[2.4, 0.12, 0.12]} position={[PLAYGROUND.x + 2, 1.2, PLAYGROUND.z]} color="#5b8def" outline={false} />

      <LrtStationMesh x={lrtStationById("taman-ceria").x} z={lrtStationById("taman-ceria").z} />

      {/* Bus stop */}
      <group position={[TAMAN_BUS_STOP.x, 0, TAMAN_BUS_STOP.z]}>
        <Box size={[4.2, 0.08, 1.4]} position={[0, 0.04, 0]} color="#6b7280" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, -0.4]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, -0.4]} color="#4b5563" outline={false} />
        <Box size={[4, 0.1, 1.2]} position={[0, 2.45, -0.2]} color="#ef4444" outline={false} />
      </group>

      {/* A few trees */}
      {[90, 98, 112, 122, 130].map((x) => (
        <group key={x} position={[x, 0, 8]}>
          <Cyl top={0.12} bottom={0.16} height={1.4} position={[0, 0.7, 0]} color="#6b4423" />
          <Cyl top={0.9} bottom={1.1} height={1.2} position={[0, 1.9, 0]} color="#2f8f4e" />
        </group>
      ))}
    </group>
  );
});
