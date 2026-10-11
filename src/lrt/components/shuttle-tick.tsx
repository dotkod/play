"use client";

/**
 * Runs shuttle sim before other LRT useFrames so the train mesh and riders
 * share one pose this frame (stops cabin slide / pole overlap while moving).
 */

import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { resetShuttle, tickShuttle } from "../sim/shuttle";

export function LrtShuttleTick({ active }: { active: boolean }) {
  // Fresh pose on mount so a stale singleton can't keep a wrong z (e.g. city centre).
  useEffect(() => {
    resetShuttle();
  }, []);

  useFrame((_, delta) => {
    if (active) tickShuttle(Math.min(delta, 1 / 20));
  }, -50);
  return null;
}
