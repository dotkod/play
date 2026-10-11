"use client";

import { useMemo } from "react";
import { PATH_MAX_X, PATH_MIN_X } from "../plan";

/** Simple grass strip under the elevated line. */
export function LrtGround() {
  const w = PATH_MAX_X - PATH_MIN_X + 80;
  const mid = (PATH_MIN_X + PATH_MAX_X) / 2;
  const geom = useMemo(() => null, []);
  void geom;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mid, 0, 8]} receiveShadow>
      <planeGeometry args={[w, 80]} />
      <meshStandardMaterial color="#7cb342" />
    </mesh>
  );
}
