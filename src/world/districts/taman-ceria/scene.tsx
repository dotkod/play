"use client";

import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box, Cyl, RBox, ToonMaterial } from "@/shared/three/toon";
import { PLAYGROUND, TERRACES, TERRACE_WALK, type Terrace } from "./layout";
import { LrtStationMesh } from "@/world/lrt-station-mesh";
import { lrtStationById } from "@/content/transit/lrt-kelana";
import { TAMAN_BUS_STOP, TAMAN_FRONT, TAMAN_HOME_DOOR, TAMAN_SOFA } from "./meta";

function HomeDoorMarker({ x, z }: { x: number; z: number }) {
  const arrow = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arrow.current) {
      arrow.current.position.y = 2.4 + Math.abs(Math.sin(t * 3)) * 0.45;
      arrow.current.rotation.y = t * 1.5;
    }
    if (ring.current) ring.current.scale.setScalar(1 + (t % 1.2) * 0.35);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.85, 1.1, 36]} />
        <meshBasicMaterial color="#fcd34d" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <group ref={arrow}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.38, 0.7, 4]} />
          <ToonMaterial color="#fcd34d" />
        </mesh>
      </group>
    </group>
  );
}

/** Malaysian terrace unit — shared front line, pitched roof, porch, door + windows. */
function TerraceHouse({ t }: { t: Terrace }) {
  const frontLocal = t.d / 2; // +z toward arterial
  const doorW = t.home ? 1.15 : 0.95;
  const winY = t.h * 0.55;
  return (
    <group position={[t.x, 0, t.z]}>
      {/* Body */}
      <RBox size={[t.w, t.h, t.d]} radius={0.06} position={[0, t.h / 2, 0]} color={t.color} />
      {/* Flat parapet + slight pitched slab */}
      <Box size={[t.w + 0.25, 0.28, t.d + 0.25]} position={[0, t.h + 0.14, 0]} color={t.roof} />
      <Box size={[t.w * 0.92, 0.35, t.d * 0.55]} position={[0, t.h + 0.45, -0.15]} color={t.roof} />
      {/* Five-foot awning */}
      <Box size={[t.w - 0.2, 0.12, 1.35]} position={[0, 2.85, frontLocal + 0.55]} color={t.roof} />
      {/* Porch slab */}
      <Box
        size={[t.w * 0.92, 0.12, 1.1]}
        position={[0, 0.06, frontLocal + 0.45]}
        color="#9a8b78"
        outline={false}
      />
      {/* Front door */}
      <Box size={[doorW, 2.15, 0.1]} position={[0, 1.15, frontLocal + 0.02]} color="#5c3d2e" />
      <Box size={[0.1, 0.1, 0.06]} position={[doorW * 0.28, 1.1, frontLocal + 0.1]} color="#c9a227" outline={false} />
      {/* Ground-floor windows */}
      <Box size={[1.1, 1.0, 0.08]} position={[-t.w * 0.28, 1.55, frontLocal + 0.02]} color="#7ec8e3" outline={false} />
      <Box size={[1.1, 1.0, 0.08]} position={[t.w * 0.28, 1.55, frontLocal + 0.02]} color="#7ec8e3" outline={false} />
      {/* Upper windows */}
      {t.h > 5.2 && (
        <>
          <Box size={[1.0, 0.9, 0.08]} position={[-t.w * 0.22, winY + 0.9, frontLocal + 0.02]} color="#a8d8ea" outline={false} />
          <Box size={[1.0, 0.9, 0.08]} position={[t.w * 0.22, winY + 0.9, frontLocal + 0.02]} color="#a8d8ea" outline={false} />
        </>
      )}
      {/* Gate posts */}
      <Box size={[0.12, 1.0, 0.12]} position={[-t.w / 2 + 0.15, 0.5, frontLocal + 1.0]} color="#6b7280" outline={false} />
      <Box size={[0.12, 1.0, 0.12]} position={[t.w / 2 - 0.15, 0.5, frontLocal + 1.0]} color="#6b7280" outline={false} />

      {t.home && (
        <>
          {/* Outdoor sofa on porch (world-space via meta) */}
          <group position={[TAMAN_SOFA.x - t.x, 0, TAMAN_SOFA.z - t.z]}>
            <Box size={[1.45, 0.4, 0.65]} position={[0, 0.32, 0]} color="#c45c4a" />
            <Box size={[1.45, 0.5, 0.18]} position={[0, 0.65, -0.28]} color="#a3483a" />
          </group>
          {/* House name plate */}
          <Box size={[2.0, 0.35, 0.06]} position={[0, 3.35, frontLocal + 0.08]} color="#1f1a17" outline={false} />
        </>
      )}
    </group>
  );
}

export const TamanScene = memo(function TamanScene() {
  return (
    <group>
      {/* Continuous paved strip along terrace fronts */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(TERRACE_WALK.x0 + TERRACE_WALK.x1) / 2, 0.02, TERRACE_WALK.z]}
        receiveShadow
      >
        <planeGeometry args={[TERRACE_WALK.x1 - TERRACE_WALK.x0, 2.4]} />
        <meshLambertMaterial color="#c4b8a8" />
      </mesh>

      {TERRACES.map((t) => (
        <TerraceHouse key={t.id} t={t} />
      ))}
      <HomeDoorMarker x={TAMAN_HOME_DOOR.x} z={TAMAN_HOME_DOOR.z} />

      {/* Playground (north of road) */}
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

      {/* Street trees on the south verge (opposite the terraces) */}
      {[92, 100, 108, 116, 124, 132].map((x) => (
        <group key={x} position={[x, 0, 7.2]}>
          <Cyl top={0.12} bottom={0.16} height={1.4} position={[0, 0.7, 0]} color="#6b4423" />
          <Cyl top={0.9} bottom={1.1} height={1.2} position={[0, 1.9, 0]} color="#2f8f4e" />
        </group>
      ))}

      {/* Quiet back lane behind terraces */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[110, 0.015, -TAMAN_FRONT - 9.2]} receiveShadow>
        <planeGeometry args={[42, 2.2]} />
        <meshLambertMaterial color="#9ca3af" />
      </mesh>
    </group>
  );
});
