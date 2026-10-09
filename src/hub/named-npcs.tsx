"use client";

import { memo, useMemo } from "react";
import { NAMED_NPCS } from "@/content/npcs";
import { Person, type Pose } from "@/shared/three/person";
import { player } from "@/world/player-bridge";
import { dynamicColliders } from "./colliders";
import { view } from "./controls";

const BASE = 40; // after pedestrians (~15) leave room

export const NamedNpcs = memo(function NamedNpcs() {
  return (
    <>
      {NAMED_NPCS.map((n, i) => (
        <StandingNpc key={n.id} id={n.id} index={BASE + i} x={n.x} z={n.z} rotY={n.rotY} look={n.look} />
      ))}
    </>
  );
});

function StandingNpc({
  id,
  index,
  x,
  z,
  rotY,
  look,
}: {
  id: string;
  index: number;
  x: number;
  z: number;
  rotY: number;
  look: (typeof NAMED_NPCS)[number]["look"];
}) {
  const getPose = useMemo(() => {
    return (): Pose => {
      dynamicColliders.people[index] = { x, z, r: 0.45 };
      const face =
        view.talk?.npcId === id ? Math.atan2(player.x - x, player.z - z) : rotY;
      return { x, z, rotY: face, walking: false, seated: false };
    };
  }, [id, index, x, z, rotY]);
  return <Person look={look} getPose={getPose} />;
}

export function nearestNamedNpc(px: number, pz: number, maxDist = 2.2) {
  let best: (typeof NAMED_NPCS)[number] | null = null;
  let bestD = maxDist;
  for (const n of NAMED_NPCS) {
    const d = Math.hypot(n.x - px, n.z - pz);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}
