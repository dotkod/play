"use client";

import { memo } from "react";
import { RailStationMesh } from "./rail-station-mesh";

/** Compact elevated LRT stub (red roof) for non-Pusat stations. */
export const LrtStationMesh = memo(function LrtStationMesh({ x, z }: { x: number; z: number }) {
  return <RailStationMesh x={x} z={z} color="#c62f25" />;
});
