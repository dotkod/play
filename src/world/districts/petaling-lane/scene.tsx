"use client";

import { memo } from "react";
import { Box, Cyl, RBox } from "@/shared/three/toon";
import { PETALING_BUS_STOP, PETALING_STREET } from "./meta";

const REDS = ["#c8372b", "#e85d4c", "#f0a030", "#d8352a"];

export const PetalingScene = memo(function PetalingScene() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[28, 0.02, -28]} receiveShadow>
        <planeGeometry args={[14, 28]} />
        <meshLambertMaterial color="#d9d5cc" />
      </mesh>
      {[-10, -4, 2, 8].map((dz, i) => (
        <group key={i}>
          <RBox size={[5, 5 + (i % 2), 5]} radius={0.08} position={[PETALING_STREET.x - 5, 2.5, PETALING_STREET.z + dz]} color="#f5e6d3" />
          <RBox size={[5, 5 + ((i + 1) % 2), 5]} radius={0.08} position={[PETALING_STREET.x + 5, 2.5, PETALING_STREET.z + dz]} color="#f0dcc8" />
          <Cyl top={0.05} bottom={0.05} height={3} position={[PETALING_STREET.x, 2.8, PETALING_STREET.z + dz]} color="#6b7178" outline={false} />
          <Box size={[0.6, 0.8, 0.05]} position={[PETALING_STREET.x, 4.2, PETALING_STREET.z + dz]} color={REDS[i % REDS.length]} outline={false} />
        </group>
      ))}
      <group position={[PETALING_BUS_STOP.x, 0, PETALING_BUS_STOP.z]}>
        <Box size={[4, 0.1, 1.2]} position={[0, 2.4, 0]} color="#c8372b" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[-1.8, 1.2, 0]} color="#4b5563" outline={false} />
        <Box size={[0.12, 2.4, 0.12]} position={[1.8, 1.2, 0]} color="#4b5563" outline={false} />
      </group>
    </group>
  );
});
