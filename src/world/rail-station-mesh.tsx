"use client";

import { memo } from "react";
import { Box } from "@/shared/three/toon";

/** Compact elevated rail stub; `color` is the line colour (roof band). */
export const RailStationMesh = memo(function RailStationMesh({
  x,
  z,
  color = "#c62f25",
}: {
  x: number;
  z: number;
  color?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[6, 0.35, 3.2]} position={[0, 3.2, 0]} color="#b9bec4" />
      {[-2.2, 2.2].map((dx) => (
        <Box key={dx} size={[0.55, 3.2, 0.55]} position={[dx, 1.6, 0]} color="#c9cdd2" />
      ))}
      <Box size={[5.2, 0.2, 3.6]} position={[0, 4.6, 0]} color={color} />
      <Box size={[1.6, 2.2, 0.2]} position={[0, 1.1, 1.7]} color="#8ec8e8" outline={false} />
    </group>
  );
});
