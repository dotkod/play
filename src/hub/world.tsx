"use client";

import { WorldRuntime } from "@/world/runtime";
import type { Building } from "./world-data";

type Props = {
  spawn: { x: number; z: number; rotY: number };
  onZone: (b: Building | null) => void;
  onNearCat?: (index: number | null) => void;
  poster?: boolean;
  active?: boolean;
};

/** Thin wrapper — world systems live in `@/world`. */
export default function World(props: Props) {
  return <WorldRuntime {...props} />;
}
