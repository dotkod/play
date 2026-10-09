"use client";

import { memo } from "react";
import { setWalkRoute } from "@/core/walk-path";
import { City } from "@/hub/city";
import { input } from "@/hub/controls";
import { player } from "@/world/player-bridge";
import { doorSpot } from "./layout";

/** Pusat Lepak full scene (buildings + props). Chunk culling arrives with WorldRuntime. */
export const PusatScene = memo(function PusatScene() {
  return (
    <City
      onBuilding={(b) => {
        const d = doorSpot(b);
        const to = { x: d.x, z: d.z };
        setWalkRoute({ x: player.x, z: player.z }, to);
        input.target = to;
      }}
    />
  );
});
