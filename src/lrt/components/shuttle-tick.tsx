"use client";

/**
 * Runs shuttle sim before other LRT useFrames so the train mesh and riders
 * share one pose this frame (stops cabin slide / pole overlap while moving).
 */

import { useFrame } from "@react-three/fiber";
import { tickShuttle } from "../sim/shuttle";

export function LrtShuttleTick({ active }: { active: boolean }) {
  useFrame((_, delta) => {
    if (active) tickShuttle(Math.min(delta, 1 / 20));
  }, -50);
  return null;
}
