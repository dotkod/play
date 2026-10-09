"use client";

import { memo } from "react";
import { MAP_TREES } from "@/hub/map-decor";
import { Ball, Cyl } from "@/shared/three/toon";

/** Park trees in open grass (matches map scatter). */
export const ScatterTrees = memo(function ScatterTrees() {
  return (
    <>
      {MAP_TREES.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <Cyl top={0.12 + t.r * 0.05} bottom={0.16} height={1.2 + t.r} position={[0, 0.6, 0]} color="#6b4423" outline={false} />
          <Ball radius={0.7 + t.r * 0.5} position={[0, 1.5 + t.r * 0.3, 0]} color="#3d9a52" />
        </group>
      ))}
    </>
  );
});
